import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Haptics = Platform.OS !== 'web'
  ? require('expo-haptics') as typeof import('expo-haptics')
  : null;

const isExpoGo = Constants.appOwnership === 'expo';

type ScanMode = 'ai' | 'barcode' | 'manual';

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const [mode, setMode] = useState<ScanMode>('ai');
  const [isCapturing, setIsCapturing] = useState(false);

  if (!permission) {
    return <View className="flex-1 bg-base" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-screen px-lg">
        <MaterialIcons name="camera-alt" size={48} color="#555555" />
        <Text className="mt-sm text-item text-text-secondary text-center">
          Camera Access Needed
        </Text>
        <Text className="mt-xs text-meta text-text-muted text-center">
          MakerVault uses your camera to photograph and identify electronic components.
        </Text>
        <Pressable
          className="mt-lg rounded-md px-xl py-[9px]"
          style={{ backgroundColor: 'rgba(240,160,48,0.12)', borderWidth: 0.5, borderColor: '#634010' }}
          onPress={requestPermission}
        >
          <Text className="text-input font-medium text-amber-500">Enable Camera</Text>
        </Pressable>
      </View>
    );
  }

  const handleCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Expo Go doesn't support takePictureAsync — go straight to gallery
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
          params: { imageUri: photo.uri, bulkMode: '0' },
        });
      }
    } catch {
      await handlePickImage();
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      router.push({
        pathname: '/confirm',
        params: { imageUri: result.assets[0].uri, bulkMode: '0' },
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Camera — no children allowed in SDK 54 */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        flash={flash ? 'on' : 'off'}
      />

      {/* Overlay — absolutely positioned on top of camera */}
      <View style={[styles.overlay, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        {/* Top bar */}
        <View className="flex-row items-center justify-between px-md">
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onPress={() => setFlash(!flash)}
          >
            <MaterialIcons name={flash ? 'flash-on' : 'flash-off'} size={18} color="#fff" />
          </Pressable>
        </View>

        {/* Mode selector */}
        <View className="mx-md mt-sm flex-row gap-[5px]">
          {([
            { key: 'ai' as ScanMode, label: 'AI Identify', icon: 'auto-awesome' as const },
            { key: 'barcode' as ScanMode, label: 'Barcode', icon: 'qr-code-scanner' as const },
            { key: 'manual' as ScanMode, label: 'Manual', icon: 'edit' as const },
          ]).map((m) => {
            const isActive = mode === m.key;
            return (
              <Pressable
                key={m.key}
                className="flex-1 flex-row items-center justify-center gap-[4px] rounded-pill py-[4px]"
                style={{
                  backgroundColor: isActive ? 'rgba(240,160,48,0.12)' : 'rgba(0,0,0,0.4)',
                  borderWidth: 0.5,
                  borderColor: isActive ? '#634010' : 'transparent',
                }}
                onPress={() => setMode(m.key)}
              >
                <MaterialIcons name={m.icon} size={12} color={isActive ? '#f0a030' : '#888888'} />
                <Text className="text-[9px] font-medium" style={{ color: isActive ? '#f0a030' : '#888888' }}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Viewfinder — centered */}
        <View className="flex-1 items-center justify-center">
          <View
            className="h-[200px] w-[200px] items-center justify-center"
            style={{ borderWidth: 1.5, borderColor: '#f0a030', borderRadius: 10 }}
          >
            <Text className="text-meta text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {isExpoGo
                ? 'Tap capture to pick\nfrom gallery'
                : mode === 'ai' ? 'Center part' : mode === 'barcode' ? 'Scan code' : ''}
            </Text>
          </View>
        </View>

        {/* Bottom controls */}
        <View className="flex-row items-center justify-around px-lg">
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onPress={handlePickImage}
          >
            <MaterialIcons name="photo-library" size={20} color="#fff" />
          </Pressable>

          {/* Capture button — amber ring */}
          <Pressable
            className="h-[64px] w-[64px] items-center justify-center rounded-full"
            style={{ borderWidth: 3, borderColor: '#f0a030' }}
            onPress={handleCapture}
            disabled={isCapturing}
          >
            <View
              className="h-[52px] w-[52px] rounded-full"
              style={{ backgroundColor: isCapturing ? 'rgba(240,160,48,0.4)' : '#f0a030' }}
            />
          </Pressable>

          <View className="h-11 w-11" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
});
