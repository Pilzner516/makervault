import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult, BarcodeType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ScreenLayout, ModeButton, EmptyState,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { hapticImpact } from '@/lib/haptics';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';

const isExpoGo = Constants.appOwnership === 'expo';

type ScanMode = 'ai' | 'bulk' | 'auto' | 'barcode' | 'manual';

const MODES: { key: ScanMode; label: string }[] = [
  { key: 'ai', label: 'Single' },
  { key: 'bulk', label: 'Multi' },
  { key: 'auto', label: 'Auto' },
  { key: 'barcode', label: 'Barcode' },
];

const BARCODE_TYPES: BarcodeType[] = [
  'ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr',
];

// New simplified prefix
const MAKERVAULT_QR_PREFIX = 'MV:';

// Legacy prefixes for backward compatibility
const LEGACY_LOCATION_PREFIX = 'makervault://location/';
const LEGACY_CATEGORY_PREFIX = 'makervault://category/';
const LEGACY_PART_PREFIX = 'makervault://part/';

// Multi-QR collection timeout (ms)
const MULTI_QR_SETTLE_MS = 1500;

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const [mode, setMode] = useState<ScanMode>('ai');
  const [isCapturing, setIsCapturing] = useState(false);
  const [barcodeScanned, setBarcodeScanned] = useState(false);

  // Multi-QR collection refs
  const collectedCodesRef = useRef<Set<string>>(new Set());
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef(false);

  // Resolve a MV: UUID — check parts, then categories, then locations
  const resolveAndNavigate = useCallback(
    async (uuid: string) => {
      // 1. Check parts (instant — in Zustand store)
      const parts = useInventoryStore.getState().parts;
      const matchedPart = parts.find((p) => p.id === uuid);
      if (matchedPart) {
        router.push(`/part/${uuid}` as never);
        return;
      }

      // 2. Check categories (quick Supabase query)
      try {
        const { supabase } = require('@/lib/supabase');
        const { data: cat } = await supabase
          .from('categories')
          .select('id')
          .eq('id', uuid)
          .single();
        if (cat) {
          router.push({ pathname: '/category/[id]' as never, params: { id: uuid } });
          return;
        }
      } catch { /* not a category */ }

      // 3. Check locations (Supabase query)
      try {
        const { supabase } = require('@/lib/supabase');
        const { data: loc } = await supabase
          .from('storage_locations')
          .select('id')
          .eq('id', uuid)
          .single();
        if (loc) {
          router.push({ pathname: '/locations' as never, params: { locationId: uuid } });
          return;
        }
      } catch { /* not a location */ }

      // 4. Fallback — try as category (screen handles 404)
      router.push({ pathname: '/category/[id]' as never, params: { id: uuid } });
    },
    [router],
  );

  // Process all collected QR codes
  const processCollectedCodes = useCallback(() => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const codes = Array.from(collectedCodesRef.current);
    collectedCodesRef.current = new Set();

    if (codes.length === 0) {
      isProcessingRef.current = false;
      return;
    }

    if (codes.length === 1) {
      // Single code — navigate directly
      resolveAndNavigate(codes[0]);
      isProcessingRef.current = false;
      return;
    }

    // Multiple codes — look up each one against parts store
    const parts = useInventoryStore.getState().parts;
    const matches: Array<{ id: string; name: string; category: string | null }> = [];

    for (const uuid of codes) {
      const matchedPart = parts.find((p) => p.id === uuid);
      if (matchedPart) {
        matches.push({ id: matchedPart.id, name: matchedPart.name, category: matchedPart.category });
      } else {
        matches.push({ id: uuid, name: 'Unknown item', category: null });
      }
    }

    // Show alert with matched items
    const itemList = matches.map((m, i) => `${i + 1}. ${m.name}`).join('\n');
    Alert.alert(
      `${matches.length} QR Codes Detected`,
      itemList,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => { setBarcodeScanned(false); } },
        ...matches.map((m) => ({
          text: m.name.slice(0, 30),
          onPress: () => { resolveAndNavigate(m.id); },
        })),
      ],
    );

    isProcessingRef.current = false;
  }, [resolveAndNavigate]);

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (barcodeScanned) return;

      const { type, data } = result;

      // ─── NEW FORMAT: MV:{uuid} ───
      if (data.startsWith(MAKERVAULT_QR_PREFIX)) {
        const uuid = data.slice(MAKERVAULT_QR_PREFIX.length);

        // Collect for multi-QR detection
        collectedCodesRef.current.add(uuid);

        // Reset settle timer — wait for more codes
        if (settleTimerRef.current) {
          clearTimeout(settleTimerRef.current);
        }

        if (!isProcessingRef.current) {
          hapticImpact('Medium');
        }

        settleTimerRef.current = setTimeout(() => {
          setBarcodeScanned(true);
          processCollectedCodes();
        }, MULTI_QR_SETTLE_MS);

        return;
      }

      // ─── LEGACY FORMAT: makervault://{type}/{id} ───
      if (data.startsWith(LEGACY_LOCATION_PREFIX)) {
        setBarcodeScanned(true);
        hapticImpact('Medium');
        const locationId = data.slice(LEGACY_LOCATION_PREFIX.length);
        router.push({
          pathname: '/locations' as '/locations',
          params: { locationId },
        });
        return;
      }

      if (data.startsWith(LEGACY_CATEGORY_PREFIX)) {
        setBarcodeScanned(true);
        hapticImpact('Medium');
        const categoryId = data.slice(LEGACY_CATEGORY_PREFIX.length);
        router.push(`/category/${categoryId}` as never);
        return;
      }

      if (data.startsWith(LEGACY_PART_PREFIX)) {
        setBarcodeScanned(true);
        hapticImpact('Medium');
        const partId = data.slice(LEGACY_PART_PREFIX.length);
        router.push(`/part/${partId}` as never);
        return;
      }

      // ─── Regular barcode — navigate to confirm for Gemini identification ───
      setBarcodeScanned(true);
      hapticImpact('Medium');
      router.push({
        pathname: '/confirm',
        params: { barcodeData: data, barcodeType: type },
      });
    },
    [barcodeScanned, router, processCollectedCodes],
  );

  if (!permission) {
    return <ScreenLayout style={{ paddingTop: insets.top }}><View /></ScreenLayout>;
  }

  if (!permission.granted) {
    return (
      <ScreenLayout style={{ paddingTop: insets.top }}>
        <EmptyState
          icon="camera-outline"
          title="CAMERA ACCESS NEEDED"
          subtitle="MakerVault uses your camera to photograph and identify electronic components."
          actionLabel="Enable Camera"
          onAction={requestPermission}
        />
      </ScreenLayout>
    );
  }

  const handleCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    hapticImpact('Medium');

    const bulk = mode === 'bulk' ? '1' : '0';

    if (isExpoGo || !cameraRef.current) {
      await handlePickImage();
      setIsCapturing(false);
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo) {
        router.push({
          pathname: '/confirm',
          params: { imageUri: photo.uri, bulkMode: bulk },
        });
      }
    } catch {
      await handlePickImage();
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickImage = async () => {
    const bulk = mode === 'bulk' ? '1' : '0';
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      router.push({
        pathname: '/confirm',
        params: { imageUri: result.assets[0].uri, bulkMode: bulk },
      });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.scanBg }}>
      {/* Camera */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        flash={flash ? 'on' : 'off'}
        {...(mode === 'barcode'
          ? {
              barcodeScannerSettings: { barcodeTypes: BARCODE_TYPES },
              onBarcodeScanned: barcodeScanned ? undefined : handleBarcodeScanned,
            }
          : {})}
      />

      {/* Overlay */}
      <View style={[styles.overlay, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.flashBtn}
            onPress={() => setFlash(!flash)}
          >
            <Ionicons name={flash ? 'flash' : 'flash-off'} size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Mode buttons — 44px tall, 13px text, fully tappable */}
        <View style={styles.modeRow}>
          {MODES.map((m) => (
            <ModeButton
              key={m.key}
              label={m.label}
              active={mode === m.key}
              onPress={() => {
                if (m.key === 'auto') {
                  router.push('/auto-scan' as never);
                } else {
                  setMode(m.key);
                  if (m.key === 'barcode') {
                    setBarcodeScanned(false);
                    collectedCodesRef.current = new Set();
                    if (settleTimerRef.current) {
                      clearTimeout(settleTimerRef.current);
                      settleTimerRef.current = null;
                    }
                    isProcessingRef.current = false;
                  }
                }
              }}
            />
          ))}
        </View>

        {/* Viewfinder */}
        <View style={styles.viewfinderWrap}>
          <View
            style={[
              styles.viewfinderFrame,
              { borderColor: colors.accent },
              mode === 'barcode' && { width: 280, height: 140 },
            ]}
          >
            <View style={[styles.corner, { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3, borderColor: colors.accent }]} />
            <View style={[styles.corner, { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3, borderColor: colors.accent }]} />
            <View style={[styles.corner, { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: colors.accent }]} />
            <View style={[styles.corner, { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3, borderColor: colors.accent }]} />
            {/* Horizontal scan line for barcode mode */}
            {mode === 'barcode' && (
              <View
                style={{
                  position: 'absolute',
                  left: 8,
                  right: 8,
                  height: 2,
                  backgroundColor: colors.accent,
                  opacity: 0.7,
                  top: '50%',
                  marginTop: -1,
                }}
              />
            )}
          </View>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.galleryBtn}
            onPress={handlePickImage}
          >
            <Ionicons name="images-outline" size={22} color="#ffffff" />
          </TouchableOpacity>

          {mode === 'barcode' ? (
            <View style={styles.barcodeHint}>
              <Ionicons name="scan-outline" size={20} color="#ffffff" />
              <Text style={styles.barcodeHintText}>
                {barcodeScanned ? 'Scanned! Tap to reset' : 'Point at barcode'}
              </Text>
              {barcodeScanned && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.barcodeResetBtn}
                  onPress={() => {
                    setBarcodeScanned(false);
                    collectedCodesRef.current = new Set();
                    isProcessingRef.current = false;
                  }}
                >
                  <Ionicons name="refresh" size={18} color="#ffffff" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.75}
              style={[styles.captureBtn, { borderColor: colors.accent }]}
              onPress={handleCapture}
              disabled={isCapturing}
            >
              <View
                style={[
                  styles.captureInner,
                  { backgroundColor: isCapturing ? colors.accentBg : colors.accent },
                ]}
              />
            </TouchableOpacity>
          )}

          <View style={{ width: 48, height: 48 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  flashBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 8,
    gap: 6,
  },
  viewfinderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderFrame: {
    width: 200,
    height: 200,
    borderWidth: 1.5,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderStyle: 'solid',
    borderWidth: 0,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  galleryBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  barcodeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 72,
    paddingHorizontal: 16,
  },
  barcodeHintText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
  },
  barcodeResetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
