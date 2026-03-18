import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  StyleSheet, Animated, Alert,
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
import { useSettingsStore } from '@/lib/zustand/settingsStore';
import { hapticImpact } from '@/lib/haptics';

const TRIGGER_MODES: { key: TriggerMode; label: string }[] = [
  { key: 'manual', label: 'Manual' },
  { key: 'stillness', label: 'Handheld' },
  { key: 'timer', label: 'On Stand' },
];

const STILLNESS_THRESHOLD = 800; // ms — shorter so natural hand tremor doesn't block
const MOTION_THRESHOLD = 0.4;   // accel delta — higher so hand tremor is ignored
const VIEWFINDER_SIZE = 220;

export default function AutoScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { handheldDelay, standDelay } = useSettingsStore();
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
      endSession();
    };
  }, []);

  // Auto-capture cycle — reads delay from refs so it's always current
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoLoopRunning = useRef(false);

  const scheduleNextCapture = () => {
    if (!autoLoopRunning.current) return;
    // Read current delay directly from store — no stale closures
    const state = useSettingsStore.getState();
    const currentMode = useAutoScanStore.getState().triggerMode;
    const delay = currentMode === 'stillness' ? state.handheldDelay * 1000 : state.standDelay * 1000;

    setDetectPhase('settling');
    autoTimerRef.current = setTimeout(() => {
      if (!autoLoopRunning.current) return;
      setDetectPhase('ready');
      // Play trace then capture — doCapture will call scheduleNextCapture after
      if (isCapturingRef.current || !cameraRef.current) {
        scheduleNextCapture(); // retry if busy
        return;
      }
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
    }, delay);
  };

  const startAutoLoop = () => {
    autoLoopRunning.current = true;
    scheduleNextCapture();
  };

  const stopAutoLoop = () => {
    autoLoopRunning.current = false;
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  // Start/stop based on trigger mode
  useEffect(() => {
    if (triggerMode === 'timer') {
      startAutoLoop();
    } else {
      stopAutoLoop();
    }
    return () => stopAutoLoop();
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

  // Handheld: try accelerometer, fall back to timer loop
  const accelSub = useRef<{ remove: () => void } | null>(null);
  const accelRunning = useRef(false);
  const hadMotion = useRef(false);
  const stillSince = useRef(0);
  const accelCheckTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startMotionDetection = () => {
    // Try accelerometer first
    try {
      const AccelMod = require('expo-sensors/build/Accelerometer');
      const Accelerometer = AccelMod.default ?? AccelMod.Accelerometer ?? AccelMod;
      if (!Accelerometer || typeof Accelerometer.setUpdateInterval !== 'function') throw new Error('no accel');

      accelRunning.current = true;
      hadMotion.current = false;
      stillSince.current = 0;
      setDetectPhase('waiting');
      let lastMag = 0;

      Accelerometer.setUpdateInterval(100);
      accelSub.current = Accelerometer.addListener(({ x, y, z }: { x: number; y: number; z: number }) => {
        if (!accelRunning.current || isCapturingRef.current) return;
        const mag = Math.sqrt(x * x + y * y + z * z);
        const delta = Math.abs(mag - lastMag);
        lastMag = mag;
        if (delta > 0.4) {
          hadMotion.current = true;
          stillSince.current = 0;
          setDetectPhase('motion');
        }
      });

      // Periodically check if still enough to capture
      accelCheckTimer.current = setInterval(() => {
        if (!accelRunning.current || isCapturingRef.current || !hadMotion.current) return;
        if (stillSince.current === 0) {
          stillSince.current = Date.now();
          setDetectPhase('settling');
        } else if (Date.now() - stillSince.current > 800) {
          stopMotionDetection();
          setDetectPhase('ready');
          scheduleNextCapture();
        }
      }, 200);
    } catch {
      // Accelerometer not available — use timer loop
      startAutoLoop();
    }
  };

  const stopMotionDetection = () => {
    accelRunning.current = false;
    if (accelSub.current) { accelSub.current.remove(); accelSub.current = null; }
    if (accelCheckTimer.current) { clearInterval(accelCheckTimer.current); accelCheckTimer.current = null; }
    stopAutoLoop();
  };

  const doCapture = async () => {
    if (isCapturingRef.current || !cameraRef.current) return;

    isCapturingRef.current = true;
    setIsCapturing(true);
    hapticImpact('Medium');

    const currentMode = useAutoScanStore.getState().triggerMode;

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo) {
        flashViewfinder();
        addCapture(photo.uri);

        if (currentMode === 'stillness') {
          // Handheld: restart motion detection (accel or fallback timer)
          setTimeout(() => startMotionDetection(), 300);
        } else if (currentMode === 'timer') {
          // On Stand: schedule next timed capture
          setTimeout(() => scheduleNextCapture(), 300);
        } else {
          // Manual mode
          setTimeout(() => showNextItemPrompt(), 500);
        }
      }
    } catch {
      if (currentMode === 'stillness') setTimeout(() => startMotionDetection(), 1000);
      else if (currentMode !== 'manual') setTimeout(() => scheduleNextCapture(), 1000);
    } finally {
      isCapturingRef.current = false;
      setIsCapturing(false);
    }
  };

  const handleViewfinderTap = () => {
    if (triggerMode === 'manual') {
      doCapture();
    } else if (!autoLoopRunning.current && !isCapturingRef.current) {
      // First tap starts the auto-loop
      startAutoLoop();
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
    stopAutoLoop();
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
          <TouchableOpacity activeOpacity={1} onPress={handleViewfinderTap}>
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
              {triggerMode === 'manual'
                ? 'TAP TO CAPTURE'
                : !autoLoopRunning.current
                  ? 'TAP TO START AUTO-SCAN'
                  : detectPhase === 'ready' ? 'CAPTURING...'
                  : detectPhase === 'settling' ? `NEXT SCAN IN ${triggerMode === 'stillness' ? handheldDelay : standDelay}S`
                  : 'AUTO-SCANNING'}
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
