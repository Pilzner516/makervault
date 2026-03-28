import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, LayoutChangeEvent,
} from 'react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ELECTRIC_BLUE } from '@/constants/theme';
import { hapticNotification } from '@/lib/haptics';
import { useTheme } from '@/context/ThemeContext';

const MAKERVAULT_QR_PREFIX = 'MV:';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QRBounds {
  x: number;
  y: number;
  w: number;
  h: number;
  timestamp: number;
}

export default function FindItemScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();

  const params = useLocalSearchParams<{
    partId: string;
    partName: string;
  }>();

  const targetId = params.partId ?? '';
  const partName = params.partName ?? 'Unknown Part';

  const [visibleCodes, setVisibleCodes] = useState<Map<string, QRBounds>>(new Map());
  const [found, setFound] = useState(false);
  const foundRef = useRef(false);

  // Camera view layout dimensions for coordinate transformation
  const [cameraLayout, setCameraLayout] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

  const handleCameraLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCameraLayout({ width, height });
  }, []);

  // Clean up stale QR codes that haven't been seen recently
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setVisibleCodes((prev) => {
        const next = new Map(prev);
        let changed = false;
        for (const [id, bounds] of next) {
          if (now - bounds.timestamp > 1000) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleScan = useCallback(
    (result: BarcodeScanningResult) => {
      const { data, bounds } = result;
      if (!data.startsWith(MAKERVAULT_QR_PREFIX)) return;

      const scannedId = data.slice(MAKERVAULT_QR_PREFIX.length);

      // Transform bounds from image coordinates to screen coordinates.
      // The bounds from expo-camera are in the camera image coordinate space.
      // We scale them proportionally to the camera view layout.
      const origin = bounds?.origin;
      const size = bounds?.size;

      if (origin && size) {
        setVisibleCodes((prev) => {
          const next = new Map(prev);
          next.set(scannedId, {
            x: origin.x,
            y: origin.y,
            w: size.width,
            h: size.height,
            timestamp: Date.now(),
          });
          return next;
        });
      }

      if (scannedId === targetId && !foundRef.current) {
        foundRef.current = true;
        setFound(true);
        hapticNotification('Success');
      }
    },
    [targetId],
  );

  // Permission loading
  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  // Permission not granted
  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
        <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
          Camera access needed
        </Text>
        <Text style={[styles.permissionSubtitle, { color: colors.textMuted }]}>
          Enable camera to find your part
        </Text>
        <TouchableOpacity
          style={[styles.permissionBtn, { backgroundColor: ELECTRIC_BLUE }]}
          onPress={requestPermission}
          activeOpacity={0.75}
        >
          <Text style={styles.permissionBtnText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full-screen camera */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScan}
        onLayout={handleCameraLayout}
      />

      {/* QR overlay rectangles */}
      {Array.from(visibleCodes.entries()).map(([id, bounds]) => {
        const isTarget = id === targetId;
        const borderColor = isTarget ? ELECTRIC_BLUE : 'rgba(255,255,255,0.3)';
        const borderWidth = isTarget ? 3 : 1.5;

        return (
          <View
            key={id}
            style={[
              styles.qrOverlay,
              {
                left: bounds.x,
                top: bounds.y,
                width: bounds.w,
                height: bounds.h,
                borderColor,
                borderWidth,
                backgroundColor: isTarget ? ELECTRIC_BLUE + '20' : 'rgba(128,128,128,0.1)',
              },
            ]}
          >
            {isTarget && (
              <View style={styles.matchLabel}>
                <Text style={styles.matchLabelText} numberOfLines={1}>
                  {partName}
                </Text>
              </View>
            )}
          </View>
        );
      })}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="scan-outline" size={18} color={ELECTRIC_BLUE} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            Looking for: {partName}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Instruction / status */}
      {!found && (
        <View style={styles.instructionWrap}>
          <Text style={styles.instructionText}>
            Point camera at QR-labeled drawers
          </Text>
        </View>
      )}

      {/* Found banner */}
      {found && (
        <View style={[styles.foundBanner, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.foundBannerInner}>
            <Ionicons name="checkmark-circle" size={28} color={ELECTRIC_BLUE} />
            <View style={styles.foundTextWrap}>
              <Text style={styles.foundTitle}>Found it!</Text>
              <Text style={styles.foundSubtitle} numberOfLines={1}>
                {partName} is in this drawer
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: ELECTRIC_BLUE }]}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Text style={styles.doneBtnText}>DONE</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },

  // Permission
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  permissionSubtitle: {
    fontSize: 14,
    marginTop: 8,
  },
  permissionBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // QR overlays
  qrOverlay: {
    position: 'absolute',
    borderRadius: 4,
  },
  matchLabel: {
    position: 'absolute',
    bottom: -28,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  matchLabelText: {
    backgroundColor: ELECTRIC_BLUE,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // Instruction
  instructionWrap: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },

  // Found banner
  foundBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingTop: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  foundBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  foundTextWrap: {
    flex: 1,
  },
  foundTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  foundSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 2,
  },
  doneBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
