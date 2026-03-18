import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { identifyPart } from '@/lib/gemini';
import { preprocessImage, createThumbnailDataUri } from '@/lib/image';
import { useSettingsStore } from '@/lib/zustand/settingsStore';

export type TriggerMode = 'stillness' | 'timer' | 'manual';
export type CaptureStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface AutoScanCapture {
  id: string;
  imageUri: string;
  thumbnailUri: string | null;
  status: CaptureStatus;
  result: {
    name: string;
    manufacturer: string | null;
    mpn: string | null;
    category: string | null;
    subcategory: string | null;
    specs: Record<string, string> | null;
    confidence: number;
    markings: string[];
  } | null;
  quantity: number;
  location: string;
  confirmed: boolean;
  discarded: boolean;
  error: string | null;
}

interface AutoScanStore {
  // Session state
  isActive: boolean;
  captures: AutoScanCapture[];
  triggerMode: TriggerMode;
  timerInterval: number; // seconds

  // Actions
  startSession: () => void;
  endSession: () => void;
  addCapture: (imageUri: string) => Promise<void>;
  updateCapture: (id: string, updates: Partial<AutoScanCapture>) => void;
  confirmCapture: (id: string) => void;
  discardCapture: (id: string) => void;
  confirmAllAboveThreshold: (threshold: number) => void;
  clearSession: () => void;
  setTriggerMode: (mode: TriggerMode) => void;
  setTimerInterval: (seconds: number) => void;
  loadTriggerPrefs: () => Promise<void>;

  // Persistence
  saveUnconfirmed: () => Promise<void>;
  loadUnconfirmed: () => Promise<void>;
  hasUnconfirmed: () => boolean;

  // Computed
  pendingCount: () => number;
  doneCount: () => number;
  failedCount: () => number;
  allReviewed: () => boolean;
  confirmedCaptures: () => AutoScanCapture[];
}

const TRIGGER_KEY = 'autoscan_trigger_mode';
const INTERVAL_KEY = 'autoscan_timer_interval';
const UNCONFIRMED_KEY = 'autoscan_unconfirmed';
let captureCounter = 0;

export const useAutoScanStore = create<AutoScanStore>((set, get) => ({
  isActive: false,
  captures: [],
  triggerMode: 'manual',
  timerInterval: 3,

  startSession: () => {
    captureCounter = 0;
    // Keep existing unconfirmed captures — only clear confirmed/discarded ones
    const existing = get().captures.filter((c) => !c.confirmed && !c.discarded);
    set({ isActive: true, captures: existing });
  },

  endSession: () => {
    set({ isActive: false });
    // Save any unconfirmed scans for later review
    get().saveUnconfirmed();
  },

  addCapture: async (imageUri: string) => {
    const id = `cap_${Date.now()}_${captureCounter++}`;
    const capture: AutoScanCapture = {
      id,
      imageUri,
      thumbnailUri: null,
      status: 'pending',
      result: null,
      quantity: 1,
      location: '',
      confirmed: false,
      discarded: false,
      error: null,
    };

    // Add to list immediately
    set((s) => ({ captures: [...s.captures, capture] }));

    // Process in background
    try {
      set((s) => ({
        captures: s.captures.map((c) => c.id === id ? { ...c, status: 'processing' as CaptureStatus } : c),
      }));

      // Get scan quality preset
      const preset = useSettingsStore.getState().getScanPreset();

      // Preprocess image
      const { base64, mimeType } = await preprocessImage(imageUri, {
        width: preset.imageWidth,
        quality: preset.jpegQuality,
      });

      // Generate thumbnail
      let thumbnailUri: string | null = null;
      try {
        thumbnailUri = await createThumbnailDataUri(imageUri);
      } catch {
        // Continue without thumbnail
      }

      // Identify with Gemini
      const result = await identifyPart(base64, mimeType);

      set((s) => ({
        captures: s.captures.map((c) =>
          c.id === id
            ? {
                ...c,
                status: 'done' as CaptureStatus,
                thumbnailUri,
                result: {
                  name: result.part_name,
                  manufacturer: result.manufacturer || null,
                  mpn: result.mpn || null,
                  category: result.category || null,
                  subcategory: result.subcategory || null,
                  specs: result.specs || null,
                  confidence: result.confidence,
                  markings: result.markings_detected,
                },
              }
            : c
        ),
      }));
    } catch (e) {
      set((s) => ({
        captures: s.captures.map((c) =>
          c.id === id
            ? { ...c, status: 'failed' as CaptureStatus, error: e instanceof Error ? e.message : 'Unknown error' }
            : c
        ),
      }));
    }
  },

  updateCapture: (id, updates) => {
    set((s) => ({
      captures: s.captures.map((c) => c.id === id ? { ...c, ...updates } : c),
    }));
  },

  confirmCapture: (id) => {
    set((s) => ({
      captures: s.captures.map((c) => c.id === id ? { ...c, confirmed: true, discarded: false } : c),
    }));
  },

  discardCapture: (id) => {
    set((s) => ({
      captures: s.captures.map((c) => c.id === id ? { ...c, discarded: true, confirmed: false } : c),
    }));
  },

  confirmAllAboveThreshold: (threshold) => {
    set((s) => ({
      captures: s.captures.map((c) => {
        if (c.discarded || c.confirmed) return c;
        if (c.status === 'done' && c.result && c.result.confidence >= threshold) {
          return { ...c, confirmed: true };
        }
        return c;
      }),
    }));
  },

  clearSession: () => {
    set({ captures: [], isActive: false });
    AsyncStorage.removeItem(UNCONFIRMED_KEY).catch(() => {});
  },

  setTriggerMode: (mode) => {
    set({ triggerMode: mode });
    AsyncStorage.setItem(TRIGGER_KEY, mode).catch(() => {});
  },

  setTimerInterval: (seconds) => {
    set({ timerInterval: seconds });
    AsyncStorage.setItem(INTERVAL_KEY, String(seconds)).catch(() => {});
  },

  loadTriggerPrefs: async () => {
    try {
      const mode = await AsyncStorage.getItem(TRIGGER_KEY);
      const interval = await AsyncStorage.getItem(INTERVAL_KEY);
      set({
        triggerMode: (mode as TriggerMode) ?? 'manual',
        timerInterval: interval ? parseInt(interval, 10) : 3,
      });
    } catch {
      // Use defaults
    }
  },

  // Persistence — save unconfirmed scans so user can return later
  saveUnconfirmed: async () => {
    const unconfirmed = get().captures.filter((c) => !c.confirmed && !c.discarded && c.status === 'done');
    if (unconfirmed.length > 0) {
      await AsyncStorage.setItem(UNCONFIRMED_KEY, JSON.stringify(unconfirmed));
    } else {
      await AsyncStorage.removeItem(UNCONFIRMED_KEY);
    }
  },

  loadUnconfirmed: async () => {
    try {
      const raw = await AsyncStorage.getItem(UNCONFIRMED_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as AutoScanCapture[];
        if (saved.length > 0) {
          // Merge with existing captures — don't lose anything
          const existing = get().captures;
          const existingIds = new Set(existing.map((c) => c.id));
          const newOnes = saved.filter((c) => !existingIds.has(c.id));
          set({ captures: [...existing, ...newOnes] });
        }
      }
    } catch {
      // Ignore
    }
  },

  hasUnconfirmed: () => {
    return get().captures.some((c) => !c.confirmed && !c.discarded && c.status === 'done');
  },

  // Computed
  pendingCount: () => get().captures.filter((c) => !c.confirmed && !c.discarded && c.status !== 'failed').length,
  doneCount: () => get().captures.filter((c) => c.status === 'done').length,
  failedCount: () => get().captures.filter((c) => c.status === 'failed').length,
  allReviewed: () => get().captures.every((c) => c.confirmed || c.discarded),
  confirmedCaptures: () => get().captures.filter((c) => c.confirmed && c.result),
}));
