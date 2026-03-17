import { View, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ScreenLayout, ModeButton, EmptyState,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';

const Haptics = Platform.OS !== 'web'
  ? require('expo-haptics') as typeof import('expo-haptics')
  : null;

const isExpoGo = Constants.appOwnership === 'expo';

type ScanMode = 'ai' | 'bulk' | 'auto' | 'barcode' | 'manual';

const MODES: { key: ScanMode; label: string }[] = [
  { key: 'ai', label: 'Single' },
  { key: 'bulk', label: 'Multi' },
  { key: 'auto', label: 'Auto-Scan' },
  { key: 'barcode', label: 'Barcode' },
];

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const [mode, setMode] = useState<ScanMode>('ai');
  const [isCapturing, setIsCapturing] = useState(false);

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
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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
                  router.push('/auto-scan' as any);
                } else {
                  setMode(m.key);
                }
              }}
            />
          ))}
        </View>

        {/* Viewfinder */}
        <View style={styles.viewfinderWrap}>
          <View style={[styles.viewfinderFrame, { borderColor: colors.accent }]}>
            <View style={[styles.corner, { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3, borderColor: colors.accent }]} />
            <View style={[styles.corner, { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3, borderColor: colors.accent }]} />
            <View style={[styles.corner, { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: colors.accent }]} />
            <View style={[styles.corner, { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3, borderColor: colors.accent }]} />
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
});
