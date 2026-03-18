import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Scan quality presets — balancing speed vs accuracy for electronics identification.
 * Electronics parts have small markings (IC packages, SMD codes, fine print) so
 * the default leans toward higher quality. Users in the field may prefer speed.
 */
export type ScanQuality = 'fast' | 'balanced' | 'detailed' | 'maximum';

export interface ScanQualityPreset {
  id: ScanQuality;
  name: string;
  description: string;
  accuracy: string;      // e.g. "~70%"
  speed: string;         // e.g. "~2s"
  imageWidth: number;    // px — sent to Gemini
  jpegQuality: number;   // 0-1
  model: string;         // Gemini model name
  useEnhancedPrompt: boolean;
}

export const SCAN_QUALITY_PRESETS: ScanQualityPreset[] = [
  {
    id: 'fast',
    name: 'FAST',
    description: 'Quick scan for obvious parts — cables, boards, large components',
    accuracy: '~65%',
    speed: '~1.5s',
    imageWidth: 512,
    jpegQuality: 0.6,
    model: 'gemini-2.5-flash',
    useEnhancedPrompt: false,
  },
  {
    id: 'balanced',
    name: 'BALANCED',
    description: 'Good for most parts — reads markings on ICs and through-hole',
    accuracy: '~80%',
    speed: '~3s',
    imageWidth: 1024,
    jpegQuality: 0.8,
    model: 'gemini-2.5-flash',
    useEnhancedPrompt: true,
  },
  {
    id: 'detailed',
    name: 'DETAILED',
    description: 'Best for small SMD parts, QFP/BGA packages, faded markings',
    accuracy: '~90%',
    speed: '~5s',
    imageWidth: 1536,
    jpegQuality: 0.9,
    model: 'gemini-2.5-flash',
    useEnhancedPrompt: true,
  },
  {
    id: 'maximum',
    name: 'MAXIMUM',
    description: 'Full resolution — for when you absolutely need to read 0402 codes',
    accuracy: '~95%',
    speed: '~8s',
    imageWidth: 2048,
    jpegQuality: 0.95,
    model: 'gemini-2.5-flash',
    useEnhancedPrompt: true,
  },
];

interface SettingsStore {
  lowStockAlertsEnabled: boolean;
  defaultLowStockThreshold: number;
  voiceEnabled: boolean;
  hapticFeedbackEnabled: boolean;
  scanQuality: ScanQuality;
  handheldDelay: number;  // seconds
  standDelay: number;     // seconds
  initialized: boolean;

  setLowStockAlerts: (enabled: boolean) => void;
  setDefaultThreshold: (threshold: number) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setHapticFeedback: (enabled: boolean) => void;
  setScanQuality: (quality: ScanQuality) => void;
  getScanPreset: () => ScanQualityPreset;
  setHandheldDelay: (seconds: number) => void;
  setStandDelay: (seconds: number) => void;
  init: () => Promise<void>;
}

const STORAGE_KEY = 'makervault_settings';

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  lowStockAlertsEnabled: false,
  defaultLowStockThreshold: 0,
  voiceEnabled: true,
  hapticFeedbackEnabled: true,
  scanQuality: 'balanced',
  handheldDelay: 2.0,
  standDelay: 3.5,
  initialized: false,

  setLowStockAlerts: (enabled) => {
    set({ lowStockAlertsEnabled: enabled });
    persistSettings(get());
  },
  setDefaultThreshold: (threshold) => {
    set({ defaultLowStockThreshold: threshold });
    persistSettings(get());
  },
  setVoiceEnabled: (enabled) => {
    set({ voiceEnabled: enabled });
    persistSettings(get());
  },
  setHapticFeedback: (enabled) => {
    set({ hapticFeedbackEnabled: enabled });
    persistSettings(get());
  },
  setScanQuality: (quality) => {
    set({ scanQuality: quality });
    persistSettings(get());
  },
  setHandheldDelay: (seconds) => {
    set({ handheldDelay: seconds });
    persistSettings(get());
  },
  setStandDelay: (seconds) => {
    set({ standDelay: seconds });
    persistSettings(get());
  },
  getScanPreset: () => {
    return SCAN_QUALITY_PRESETS.find((p) => p.id === get().scanQuality) ?? SCAN_QUALITY_PRESETS[1];
  },

  init: async () => {
    if (get().initialized) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SettingsStore>;
        set({
          lowStockAlertsEnabled: saved.lowStockAlertsEnabled ?? false,
          defaultLowStockThreshold: saved.defaultLowStockThreshold ?? 0,
          voiceEnabled: saved.voiceEnabled ?? true,
          hapticFeedbackEnabled: saved.hapticFeedbackEnabled ?? true,
          scanQuality: saved.scanQuality ?? 'balanced',
          handheldDelay: saved.handheldDelay ?? 2.0,
          standDelay: saved.standDelay ?? 3.5,
        });
      }
    } catch {
      // Use defaults
    }
    set({ initialized: true });
  },
}));

function persistSettings(state: SettingsStore) {
  const data = {
    lowStockAlertsEnabled: state.lowStockAlertsEnabled,
    defaultLowStockThreshold: state.defaultLowStockThreshold,
    voiceEnabled: state.voiceEnabled,
    hapticFeedbackEnabled: state.hapticFeedbackEnabled,
    scanQuality: state.scanQuality,
    handheldDelay: state.handheldDelay,
    standDelay: state.standDelay,
  };
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
}
