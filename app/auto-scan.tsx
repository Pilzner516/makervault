import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  StyleSheet, Platform, Animated, Alert,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout, EmptyState, ModeButton } from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { useAutoScanStore, TriggerMode } from '@/lib/zustand/autoScanStore';

const Haptics = Platform.OS !== 'web'
  ? require('expo-haptics') as typeof import('expo-haptics')
  : null;

const TRIGGER_MODES: { key: TriggerMode; label: string }[] = [
  { key: 'manual', label: 'Manual' },
  { key: 'stillness', label: 'Handheld' },
  { key: 'timer', label: 'On Stand' },
];

const STILLNESS_THRESHOLD = 1200;
const STAND_CAPTURE_INTERVAL = 4000; // 4 seconds between captures in stand mode
const VIEWFINDER_SIZE = 220;

export default function AutoScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flash, setFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const isCapturingRef = useRef(false);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const nextItemAnim = useRef(new Animated.Value(0)).current;
  const [showTrace, setShowTrace] = useState(false);
  const [showNextItem, setShowNextItem] = useState(false);
  const [detectPhase, setDetectPhase] = useState<'waiting' | 'motion' | 'settling' | 'ready'>('waiting');
  const lastCaptureTime = useRef(0);
  const motionDetectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    captures, triggerMode, timerInterval,
    startSession, endSession, addCapture,
    setTriggerMode, loadTriggerPrefs,
  } = useAutoScanStore();

  useEffect(() => {
    loadTriggerPrefs();
    startSession();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (motionDetectTimer.current) clearTimeout(motionDetectTimer.current);
      stopMotionDetection();
      stopStandDetection();
      endSession();
    };
  }, []);

  // Stand mode — scene change detection via tiny snapshot brightness comparison
  const standRef = useRef<{ running: boolean; lastSize: number; stillSince: number; interval: ReturnType<typeof setInterval> | null }>({
    running: false, lastSize: 0, stillSince: 0, interval: null,
  });

  const startStandDetection = useCallback(() => {
    const state = standRef.current;
    state.running = true;
    state.lastSize = 0;
    state.stillSince = 0;
    setDetectPhase('waiting');

    state.interval = setInterval(async () => {
      if (!state.running || isCapturingRef.current || !cameraRef.current) return;

      try {
        // Take the tiniest possible snapshot — just to compare file size
        const snap = await cameraRef.current.takePictureAsync({ quality: 0.01 });
        if (!snap) return;

        // File size of even a tiny JPEG changes when the scene changes
        const size = snap.width * snap.height;

        if (state.lastSize === 0) {
          state.lastSize = size;
          return;
        }

        const diff = Math.abs(size - state.lastSize) / Math.max(state.lastSize, 1);
        state.lastSize = size;

        if (diff > 0.03) {
          // Scene changed — item was swapped
          setDetectPhase('motion');
          state.stillSince = 0;
        } else {
          // Scene stable
          if (state.stillSince === 0) {
            state.stillSince = Date.now();
            setDetectPhase('settling');
          } else if (Date.now() - state.stillSince > STILLNESS_THRESHOLD) {
            // Stable long enough — capture
            state.running = false;
            if (state.interval) clearInterval(state.interval);
            setDetectPhase('ready');
            playTraceAndCapture();
          }
        }
      } catch {
        // Snapshot failed — skip this cycle
      }
    }, 1500); // Check every 1.5s — very light on battery/CPU
  }, []);

  const stopStandDetection = () => {
    standRef.current.running = false;
    if (standRef.current.interval) {
      clearInterval(standRef.current.interval);
      standRef.current.interval = null;
    }
  };

  useEffect(() => {
    if (triggerMode === 'timer') {
      startStandDetection();
    } else {
      stopStandDetection();
    }
    return () => stopStandDetection();
  }, [triggerMode]);

  useEffect(() => {
    if (triggerMode === 'stillness' && captures.length === 0) {
      setDetectPhase('waiting');
      setShowNextItem(true);
    }
  }, [triggerMode, captures.length]);

  const flashViewfinder = () => {
    flashAnim.setValue(1);
    Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  const showNextItemPrompt = () => {
    setShowNextItem(true);
    nextItemAnim.setValue(0);
    Animated.sequence([
      Animated.timing(nextItemAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(nextItemAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowNextItem(false));
  };

  // Trace animation — 4 segments light up in sequence (opacity, useNativeDriver: true)
  const traceTopOp = useRef(new Animated.Value(0)).current;
  const traceRightOp = useRef(new Animated.Value(0)).current;
  const traceBottomOp = useRef(new Animated.Value(0)).current;
  const traceLeftOp = useRef(new Animated.Value(0)).current;

  // ─── MOTION DETECTION via accelerometer ───
  // Uses device accelerometer instead of camera snapshots.
  // Zero disk writes, minimal battery, no camera frame processing.
  // Detects: motion spike (item swap) → stillness (item settled) → capture.
  const autoRunning = useRef(false);
  const hadMotion = useRef(false);
  const stillnessStart = useRef(0);
  const accelSub = useRef<{ remove: () => void } | null>(null);
  const motionCheckTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startMotionDetection = useCallback(() => {
    autoRunning.current = true;
    hadMotion.current = false;
    stillnessStart.current = 0;
    setDetectPhase('waiting');

    let lastMag = 0;
    let isMoving = false;

    // Subscribe to accelerometer at ~10Hz (100ms interval) — very low power
    try {
      const { Accelerometer } = require('expo-sensors') as typeof import('expo-sensors');
      Accelerometer.setUpdateInterval(100);

      accelSub.current = Accelerometer.addListener(({ x, y, z }) => {
        if (!autoRunning.current || isCapturingRef.current) return;

        // Calculate magnitude of acceleration (gravity is ~1.0)
        const mag = Math.sqrt(x * x + y * y + z * z);
        const delta = Math.abs(mag - lastMag);
        lastMag = mag;

        // Threshold: delta > 0.15 = motion (hand moving, item being placed)
        if (delta > 0.15) {
          isMoving = true;
          hadMotion.current = true;
          stillnessStart.current = 0;
          setDetectPhase('motion');
        } else {
          isMoving = false;
        }
      });
    } catch {
      // Accelerometer not available — fall back to timed capture
      setDetectPhase('settling');
    }

    // Check stillness periodically — separate from accel events
    motionCheckTimer.current = setInterval(() => {
      if (!autoRunning.current || isCapturingRef.current) return;

      if (!hadMotion.current) {
        // Haven't seen motion yet — still waiting for first item
        return;
      }

      // We've had motion and now checking if still
      if (stillnessStart.current === 0) {
        // Just stopped moving
        stillnessStart.current = Date.now();
        setDetectPhase('settling');
      } else if (Date.now() - stillnessStart.current > STILLNESS_THRESHOLD) {
        // Still long enough — capture!
        stopMotionDetection();
        setDetectPhase('ready');
        playTraceAndCapture();
      }
    }, 200);
  }, []);

  const stopMotionDetection = () => {
    autoRunning.current = false;
    if (accelSub.current) {
      accelSub.current.remove();
      accelSub.current = null;
    }
    if (motionCheckTimer.current) {
      clearInterval(motionCheckTimer.current);
      motionCheckTimer.current = null;
    }
  };

  const playTraceAndCapture = useCallback(() => {
    if (isCapturingRef.current || !cameraRef.current) return;

    setShowTrace(true);
    traceTopOp.setValue(0);
    traceRightOp.setValue(0);
    traceBottomOp.setValue(0);
    traceLeftOp.setValue(0);

    Animated.sequence([
      Animated.timing(traceTopOp, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(traceRightOp, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(traceBottomOp, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(traceLeftOp, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setShowTrace(false);
      doCapture();
    });
  }, []);

  const doCapture = useCallback(async () => {
    if (isCapturingRef.current || !cameraRef.current) return;

    isCapturingRef.current = true;
    setIsCapturing(true);
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo) {
        flashViewfinder();
        addCapture(photo.uri);

        if (triggerMode === 'stillness') {
          // Handheld: restart accelerometer detection
          setTimeout(() => startMotionDetection(), 500);
        } else if (triggerMode === 'timer') {
          // On Stand: restart scene detection
          setTimeout(() => startStandDetection(), 500);
        } else {
          setTimeout(() => showNextItemPrompt(), 500);
        }
      }
    } catch {
      // Camera capture failed — restart detection
      if (triggerMode === 'stillness') startMotionDetection();
    } finally {
      isCapturingRef.current = false;
      setIsCapturing(false);
    }
  }, [addCapture, triggerMode, startMotionDetection]);

  const handleViewfinderTap = () => {
    if (triggerMode === 'stillness' && !isCapturingRef.current) {
      // First tap starts auto-scan — begin motion detection
      startMotionDetection();
    }
  };

  const handleHome = () => {
    const scanCount = captures.length;
    const unconfirmed = captures.filter((c) => !c.confirmed && !c.discarded).length;

    if (scanCount > 0) {
      Alert.alert(
        'Leave Auto-Scan?',
        unconfirmed > 0
          ? `You have ${unconfirmed} unreviewed scan${unconfirmed !== 1 ? 's' : ''}. They will be saved for review when you return.`
          : 'Your scans are saved. You can review them later.',
        [
          { text: 'Keep scanning', style: 'cancel' },
          { text: 'Review now', onPress: () => { endSession(); router.replace('/auto-scan-review' as any); } },
          { text: 'Go home', onPress: () => { endSession(); router.back(); } },
        ]
      );
    } else {
      router.back();
    }
  };

  const handleDone = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (motionDetectTimer.current) clearTimeout(motionDetectTimer.current);
    stopMotionDetection();
    stopStandDetection();
    endSession();
    router.replace('/auto-scan-review' as any);
  };

  const scanCount = captures.length;
  const processingCount = captures.filter((c) => c.status === 'processing').length;

  if (!permission) {
    return <ScreenLayout style={{ paddingTop: insets.top }}><View /></ScreenLayout>;
  }

  if (!permission.granted) {
    return (
      <ScreenLayout style={{ paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState icon="camera-outline" title="CAMERA ACCESS NEEDED"
          subtitle="Auto-scan requires camera access." actionLabel="Enable Camera" onAction={requestPermission} />
      </ScreenLayout>
    );
  }

  // All blues — no green. Brighter = closer to capture
  const viewfinderColor =
    detectPhase === 'motion' ? colors.textSecondary :
    detectPhase === 'settling' ? colors.accent :
    detectPhase === 'ready' ? colors.textPrimary :
    colors.accent;

  // Trace uses opacity-based animation (4 full-length segments that fade in sequentially)

  return (
    <View style={{ flex: 1, backgroundColor: colors.scanBg }}>
      <Stack.Screen options={{ headerShown: false }} />

      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} flash={flash ? 'on' : 'off'} />

      <View style={[s.overlay, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        {/* Top bar — all buttons have opaque backgrounds */}
        <View style={s.topBar}>
          <TouchableOpacity activeOpacity={0.7} style={s.opaqueBtn} onPress={handleHome}>
            <Ionicons name="home" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={[s.countBadge, { backgroundColor: 'rgba(0,0,0,0.7)', borderColor: colors.accentBorder }]}>
            <Ionicons name="scan" size={14} color={colors.accent} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.accent }}>{scanCount}</Text>
            <Text style={{ fontSize: 14, color: colors.accent }}>SCANNED</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity activeOpacity={0.7} style={s.opaqueBtn} onPress={() => setFlash(!flash)}>
              <Ionicons name={flash ? 'flash' : 'flash-off'} size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={[s.opaqueBtn, facing === 'front' && { backgroundColor: colors.accent }]}
              onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}>
              <Ionicons name="camera-reverse" size={18} color={facing === 'front' ? colors.bgBase : '#fff'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Trigger mode */}
        <View style={s.triggerRow}>
          {TRIGGER_MODES.map((m) => (
            <ModeButton key={m.key} label={m.label} active={triggerMode === m.key} onPress={() => setTriggerMode(m.key)} />
          ))}
        </View>

        {/* Spacer — pushes bottom content down */}
        <View style={{ flex: 1 }} />

        {/* Viewfinder — ABSOLUTELY POSITIONED at screen center, independent of all flex layout */}
        <View style={s.viewfinderAbsolute} pointerEvents="box-none">
          <TouchableOpacity activeOpacity={1} onPress={triggerMode === 'stillness' ? handleViewfinderTap : triggerMode === 'manual' ? doCapture : undefined}>
            <View style={[s.viewfinder, { borderColor: viewfinderColor }]}>
              <View style={[s.corner, { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3, borderColor: viewfinderColor }]} />
              <View style={[s.corner, { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3, borderColor: viewfinderColor }]} />
              <View style={[s.corner, { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: viewfinderColor }]} />
              <View style={[s.corner, { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3, borderColor: viewfinderColor }]} />

              {showTrace && (
                <>
                  <Animated.View style={[s.traceTop, { opacity: traceTopOp, backgroundColor: colors.accent }]} />
                  <Animated.View style={[s.traceRight, { opacity: traceRightOp, backgroundColor: colors.accent }]} />
                  <Animated.View style={[s.traceBottom, { opacity: traceBottomOp, backgroundColor: colors.accent }]} />
                  <Animated.View style={[s.traceLeft, { opacity: traceLeftOp, backgroundColor: colors.accent }]} />
                </>
              )}

              <Animated.View style={[s.flashOverlay, { opacity: flashAnim, backgroundColor: colors.accent }]} />
            </View>
          </TouchableOpacity>

          {/* Phase label — below viewfinder but still absolute to screen */}
          <View style={[s.phaseBadge, { backgroundColor: 'rgba(0,0,0,0.7)', marginTop: 12 }]}>
            <Text style={[s.phaseText, { color: viewfinderColor }]}>
              {triggerMode === 'stillness'
                ? detectPhase === 'waiting' ? 'WATCHING FOR MOTION...'
                : detectPhase === 'motion' ? 'MOTION DETECTED'
                : detectPhase === 'settling' ? 'HOLD STILL...'
                : detectPhase === 'ready' ? 'CAPTURING...'
                : 'HANDHELD AUTO-SCAN'
              : triggerMode === 'timer'
                ? detectPhase === 'waiting' ? 'WATCHING FOR SCENE CHANGE...'
                : detectPhase === 'motion' ? 'CHANGE DETECTED'
                : detectPhase === 'settling' ? 'HOLD STILL...'
                : detectPhase === 'ready' ? 'CAPTURING...'
                : 'ON STAND · PLACE ITEM'
                : 'TAP VIEWFINDER TO CAPTURE'}
            </Text>
          </View>

          {processingCount > 0 && (
            <View style={[s.processingBadge, { backgroundColor: 'rgba(0,0,0,0.7)', marginTop: 4 }]}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accent }}>PROCESSING {processingCount}...</Text>
            </View>
          )}
        </View>

        {/* NEXT ITEM — only in manual mode, briefly */}
        {showNextItem && triggerMode === 'manual' && (
          <Animated.View style={[s.fullScreenOverlay, { opacity: nextItemAnim }]} pointerEvents="none">
            <View style={[s.nextItemBox, { backgroundColor: 'rgba(0,0,0,0.85)', borderColor: colors.accent }]}>
              <Ionicons name="arrow-down" size={24} color={colors.accent} />
              <Text style={[s.nextItemText, { color: colors.accent }]}>NEXT ITEM</Text>
            </View>
          </Animated.View>
        )}

        {/* Thumbnail strip */}
        {captures.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbStrip}>
            {captures.map((cap) => (
              <View key={cap.id} style={s.thumbWrap}>
                <Image source={{ uri: cap.thumbnailUri ?? cap.imageUri }} style={s.thumb} contentFit="cover" />
                <View style={[s.thumbStatus, {
                  backgroundColor: cap.status === 'done' ? colors.statusOk : cap.status === 'failed' ? colors.statusOut : cap.status === 'processing' ? colors.accent : colors.textMuted,
                }]}>
                  {cap.status === 'processing'
                    ? <ActivityIndicator size={8} color="#fff" />
                    : <Ionicons name={cap.status === 'done' ? 'checkmark' : cap.status === 'failed' ? 'close' : 'ellipsis-horizontal'} size={10} color="#fff" />}
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Bottom controls */}
        <View style={s.bottomBar}>
          {triggerMode === 'manual' && (
            <TouchableOpacity activeOpacity={0.75} style={[s.captureBtn, { borderColor: colors.accent }]}
              onPress={doCapture} disabled={isCapturing}>
              <View style={[s.captureInner, { backgroundColor: isCapturing ? colors.accentBg : colors.accent }]} />
            </TouchableOpacity>
          )}
          <TouchableOpacity activeOpacity={0.75}
            style={[s.doneBtn, { backgroundColor: scanCount > 0 ? colors.accent : 'rgba(0,0,0,0.7)' }]}
            onPress={handleDone} disabled={scanCount === 0}>
            <Text style={[s.doneBtnText, { color: scanCount > 0 ? colors.bgBase : colors.textMuted }]}>
              DONE · REVIEW {scanCount} ITEM{scanCount !== 1 ? 'S' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  opaqueBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  countBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 4, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  triggerRow: { flexDirection: 'row', marginHorizontal: 12, gap: 6 },
  // Viewfinder — absolutely positioned at exact screen center, immune to flex changes
  viewfinderAbsolute: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -(VIEWFINDER_SIZE / 2) - 20, // offset up slightly for phase label below
    marginLeft: -(VIEWFINDER_SIZE / 2),
    alignItems: 'center',
    zIndex: 10,
  },
  viewfinder: { width: VIEWFINDER_SIZE, height: VIEWFINDER_SIZE, borderWidth: 2, borderRadius: 4, position: 'relative', overflow: 'hidden' },
  corner: { position: 'absolute', width: 28, height: 28, borderStyle: 'solid', borderWidth: 0 },
  traceTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, zIndex: 5 },
  traceRight: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 3, zIndex: 5 },
  traceBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, zIndex: 5 },
  traceLeft: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, zIndex: 5 },
  flashOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 4 },
  // "NEXT ITEM" — covers entire screen, always centered
  fullScreenOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 30 },
  nextItemBox: { alignItems: 'center', padding: 16, borderRadius: 4, borderWidth: 2, gap: 6 },
  nextItemText: { fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
  nextItemSub: { fontSize: 14, textAlign: 'center' },
  phaseBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 4 },
  phaseText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.05, textAlign: 'center' },
  processingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 },
  thumbStrip: { paddingHorizontal: 12, gap: 6, paddingVertical: 4 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 52, height: 52, borderRadius: 4 },
  thumbStatus: { position: 'absolute', bottom: 2, right: 2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 12 },
  captureBtn: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  captureInner: { width: 50, height: 50, borderRadius: 25 },
  doneBtn: { flex: 1, borderRadius: 4, paddingVertical: 14, alignItems: 'center' },
  doneBtnText: { fontSize: 16, fontWeight: '800' },
});
