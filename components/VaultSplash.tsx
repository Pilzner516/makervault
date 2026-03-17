/**
 * MakerVault — Vault Splash Screen
 * ==================================
 * Cinematic launch sequence:
 *   1. Grid + corners appear
 *   2. Vault door springs in
 *   3. Dial spins (combination lock tumblers)
 *   4. Latches unlock one by one
 *   5. Door swings open (3D perspective)
 *   6. Flash
 *   7. Home screen zooms in from centre
 *   8. onComplete() fires
 *
 * Place at: components/VaultSplash.tsx
 *
 * Dependencies:
 *   npx expo install expo-linear-gradient
 *   npx expo install react-native-reanimated  (likely installed)
 *
 * Usage in _layout.tsx:
 *   const [ready, setReady] = useState(false);
 *   ...
 *   {!ready && <VaultSplash onComplete={() => setReady(true)} />}
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions,
  StatusBar, Easing,
} from 'react-native';
// Auto-detect LinearGradient native module
let LinearGradient: React.ComponentType<any> | null = null;
try {
  const mod = require('expo-linear-gradient');
  const { UIManager, Platform } = require('react-native');
  const hasNative = Platform.OS === 'web' ||
    UIManager.getViewManagerConfig?.('ExpoLinearGradient') != null ||
    UIManager['ExpoLinearGradient'] != null;
  if (hasNative) LinearGradient = mod.LinearGradient;
} catch {}

const { width: W, height: H } = Dimensions.get('window');
const DOOR_SIZE = Math.min(W * 0.52, 200);
const DIAL_SIZE = DOOR_SIZE * 0.56;

interface Props {
  onComplete?: () => void;
  children?: React.ReactNode; // your home screen — passed in for zoom reveal
}

export function VaultSplash({ onComplete, children }: Props) {

  // ── ANIMATION VALUES ────────────────────────────────────────────────────────
  const gridOpacity     = useRef(new Animated.Value(0)).current;
  const cornerOpacity   = useRef(new Animated.Value(0)).current;
  const doorScale       = useRef(new Animated.Value(0.5)).current;
  const doorOpacity     = useRef(new Animated.Value(0)).current;
  const doorTranslateY  = useRef(new Animated.Value(30)).current;
  const dialRotate      = useRef(new Animated.Value(0)).current;
  const latch1          = useRef(new Animated.Value(0)).current;
  const latch2          = useRef(new Animated.Value(0)).current;
  const latch3          = useRef(new Animated.Value(0)).current;
  const doorRotateY     = useRef(new Animated.Value(0)).current; // 0→-78 = open
  const nameOpacity     = useRef(new Animated.Value(0)).current;
  const nameTranslateY  = useRef(new Animated.Value(12)).current;
  const loadWidth       = useRef(new Animated.Value(0)).current;
  const loadOpacity     = useRef(new Animated.Value(0)).current;
  const flashOpacity    = useRef(new Animated.Value(0)).current;
  const homeScale       = useRef(new Animated.Value(2.5)).current;
  const homeOpacity     = useRef(new Animated.Value(0)).current;
  const splashOpacity   = useRef(new Animated.Value(1)).current;
  const versionOpacity  = useRef(new Animated.Value(0)).current;
  // Scan trace — accent line traces around the vault door frame
  const scanTraceTop    = useRef(new Animated.Value(0)).current;
  const scanTraceRight  = useRef(new Animated.Value(0)).current;
  const scanTraceBottom = useRef(new Animated.Value(0)).current;
  const scanTraceLeft   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ── SEQUENCE ──────────────────────────────────────────────────────────────

    // 100ms: grid fades in
    Animated.timing(gridOpacity, {
      toValue: 1, duration: 700, delay: 100, useNativeDriver: true,
    }).start();

    // 500ms: corner markers
    Animated.timing(cornerOpacity, {
      toValue: 1, duration: 400, delay: 500, useNativeDriver: true,
    }).start();

    // 700ms: vault door springs in
    Animated.parallel([
      Animated.spring(doorScale, {
        toValue: 1, tension: 120, friction: 8, delay: 700, useNativeDriver: true,
      }),
      Animated.timing(doorOpacity, {
        toValue: 1, duration: 400, delay: 700, useNativeDriver: true,
      }),
      Animated.spring(doorTranslateY, {
        toValue: 0, tension: 120, friction: 8, delay: 700, useNativeDriver: true,
      }),
    ]).start();

    // 700ms: scan trace around the vault door frame
    Animated.sequence([
      Animated.delay(700),
      Animated.timing(scanTraceTop, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(scanTraceRight, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(scanTraceBottom, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(scanTraceLeft, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // 900ms: dial combination spin — left 120, right -80, left 200, settle
    Animated.sequence([
      Animated.delay(900),
      Animated.timing(dialRotate, {
        toValue: -120, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.delay(200),
      Animated.timing(dialRotate, {
        toValue: 80, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.delay(200),
      Animated.timing(dialRotate, {
        toValue: -200, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.delay(150),
      // settle — tiny bounce back
      Animated.timing(dialRotate, {
        toValue: -190, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();

    // App name fades up at 1500ms
    Animated.parallel([
      Animated.timing(nameOpacity, {
        toValue: 1, duration: 600, delay: 1500, useNativeDriver: true,
      }),
      Animated.spring(nameTranslateY, {
        toValue: 0, tension: 100, friction: 10, delay: 1500, useNativeDriver: true,
      }),
    ]).start();

    // Loading bar at 1900ms
    Animated.timing(loadOpacity, {
      toValue: 1, duration: 300, delay: 1900, useNativeDriver: true,
    }).start();
    Animated.timing(loadWidth, {
      toValue: 1, duration: 1400, delay: 2000, useNativeDriver: false,
    }).start();

    // Version label
    Animated.timing(versionOpacity, {
      toValue: 1, duration: 400, delay: 2000, useNativeDriver: true,
    }).start();

    // 3100ms: latches pop open one by one
    Animated.sequence([
      Animated.delay(3100),
      Animated.timing(latch1, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.delay(120),
      Animated.timing(latch2, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.delay(120),
      Animated.timing(latch3, { toValue: 1, duration: 200, useNativeDriver: false }),
    ]).start();

    // 3700ms: door swings open
    Animated.timing(doorRotateY, {
      toValue: 1, duration: 1100,
      delay: 3700,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // 4500ms: flash
    Animated.sequence([
      Animated.delay(4500),
      Animated.timing(flashOpacity, {
        toValue: 0.15, duration: 200, useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 0, duration: 300, useNativeDriver: true,
      }),
    ]).start();

    // 4600ms: home zooms in from centre
    Animated.parallel([
      Animated.timing(homeOpacity, {
        toValue: 1, duration: 100, delay: 4600, useNativeDriver: true,
      }),
      Animated.timing(homeScale, {
        toValue: 1, duration: 700, delay: 4600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 5100ms: splash fades out, onComplete fires
    Animated.timing(splashOpacity, {
      toValue: 0, duration: 400, delay: 5100, useNativeDriver: true,
    }).start(() => {
      onComplete?.();
    });

  }, []);

  // ── INTERPOLATIONS ─────────────────────────────────────────────────────────

  const dialRotateDeg = dialRotate.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  // Simulated door 3D open using scaleX + translateX
  const doorScaleX = doorRotateY.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.05],
  });
  const doorTranslateX = doorRotateY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -DOOR_SIZE * 0.47],
  });
  const doorShadowOpacity = doorRotateY.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.1],
  });

  const loadBarWidth = loadWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const latch1H = latch1.interpolate({ inputRange: [0, 1], outputRange: ['100%', '0%'] });
  const latch2H = latch2.interpolate({ inputRange: [0, 1], outputRange: ['100%', '0%'] });
  const latch3H = latch3.interpolate({ inputRange: [0, 1], outputRange: ['100%', '0%'] });

  // ── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#020609" />

      {/* Home screen underneath — zooms in */}
      <Animated.View style={[styles.homeWrap, {
        opacity: homeOpacity,
        transform: [{ scale: homeScale }],
      }]}>
        {children}
      </Animated.View>

      {/* Splash overlay */}
      <Animated.View style={[styles.splash, { opacity: splashOpacity }]}>

        {/* Grid */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: gridOpacity }]}>
          {Array.from({ length: Math.ceil(H / 24) }).map((_, i) => (
            <View key={`h${i}`} style={[styles.gridH, { top: i * 24 }]} />
          ))}
          {Array.from({ length: Math.ceil(W / 24) }).map((_, i) => (
            <View key={`v${i}`} style={[styles.gridV, { left: i * 24 }]} />
          ))}
        </Animated.View>

        {/* Corner markers */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: cornerOpacity }]}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </Animated.View>

        {/* Centre content */}
        <View style={styles.centre}>

          {/* SCAN TRACE — accent edges around the vault door */}
          <View style={{ width: DOOR_SIZE + 8, height: DOOR_SIZE + 8, position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#00c8e8', opacity: scanTraceTop }} />
            <Animated.View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 2, backgroundColor: '#00c8e8', opacity: scanTraceRight }} />
            <Animated.View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: '#00c8e8', opacity: scanTraceBottom }} />
            <Animated.View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 2, backgroundColor: '#00c8e8', opacity: scanTraceLeft }} />
          </View>

          {/* VAULT DOOR */}
          <Animated.View style={{
            opacity: doorOpacity,
            transform: [
              { scale: doorScale },
              { translateY: doorTranslateY },
            ],
          }}>
            <Animated.View style={[styles.door, {
              opacity: doorShadowOpacity,
              transform: [
                { scaleX: doorScaleX },
                { translateX: doorTranslateX },
              ],
            }]}>
              {/* Shimmer */}
              {LinearGradient ? (
                <LinearGradient
                  colors={['transparent', 'rgba(0,200,232,0.6)', 'transparent']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.doorShimmer}
                />
              ) : (
                <View style={[styles.doorShimmer, { backgroundColor: 'rgba(0,200,232,0.15)' }]} />
              )}

              {/* Hinges */}
              <View style={[styles.hinge, { top: DOOR_SIZE * 0.14 }]} />
              <View style={[styles.hinge, { bottom: DOOR_SIZE * 0.14 }]} />

              {/* Outer ring */}
              <View style={styles.doorRing} />

              {/* Corner bolts */}
              {[[0.11,0.11],[0.11,0.78],[0.78,0.11],[0.78,0.78],
                [0.11,0.44],[0.78,0.44],[0.44,0.11],[0.44,0.78]].map(([t,l], i) => (
                <View key={i} style={[styles.bolt, { top: DOOR_SIZE*t, left: DOOR_SIZE*l }]} />
              ))}

              {/* Latch indicators — right side */}
              <View style={styles.latchCol}>
                <View style={styles.latchTrack}>
                  <Animated.View style={[styles.latchFill, { height: latch1H, backgroundColor: '#00c8e8' }]} />
                </View>
                <View style={styles.latchTrack}>
                  <Animated.View style={[styles.latchFill, { height: latch2H, backgroundColor: '#00c8e8' }]} />
                </View>
                <View style={styles.latchTrack}>
                  <Animated.View style={[styles.latchFill, { height: latch3H, backgroundColor: '#00c8e8' }]} />
                </View>
              </View>

              {/* DIAL */}
              <View style={styles.dialWrap}>
                <View style={styles.dialOuter}>
                  {/* Tick marks */}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <View key={i} style={[styles.tick, {
                      transform: [{ rotate: `${i * 30}deg` }, { translateX: -1 }],
                    }]} />
                  ))}
                  {/* Pointer at top */}
                  <View style={styles.dialPointer} />

                  {/* Inner dial — spins */}
                  <Animated.View style={[styles.dialInner, {
                    transform: [{ rotate: dialRotateDeg }],
                  }]}>
                    <MLetterIcon size={DIAL_SIZE * 0.46} />
                  </Animated.View>
                </View>
              </View>

              {/* Keyhole at bottom */}
              <View style={styles.keyholeWrap}>
                <View style={styles.keyholeCircle} />
                <View style={styles.keyholeStem} />
              </View>
            </Animated.View>
          </Animated.View>

          {/* APP NAME */}
          <Animated.View style={[styles.nameArea, {
            opacity: nameOpacity,
            transform: [{ translateY: nameTranslateY }],
          }]}>
            <Text style={styles.appName}>
              Maker<Text style={styles.appNameAccent}>Vault</Text>
            </Text>
            <Text style={styles.tagline}>WORKSHOP INVENTORY SYSTEM</Text>
            {LinearGradient ? (
              <LinearGradient
                colors={['transparent', 'rgba(0,200,232,0.4)', 'transparent']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.nameLine}
              />
            ) : (
              <View style={[styles.nameLine, { backgroundColor: 'rgba(0,200,232,0.15)' }]} />
            )}
          </Animated.View>

          {/* LOADING BAR */}
          <Animated.View style={[styles.loadArea, { opacity: loadOpacity }]}>
            <View style={styles.loadTrack}>
              <Animated.View style={[styles.loadFill, { width: loadBarWidth }]} />
            </View>
            <Text style={styles.loadText}>UNLOCKING VAULT</Text>
          </Animated.View>

        </View>

        {/* Version */}
        <Animated.Text style={[styles.version, { opacity: versionOpacity }]}>
          V2.1.0 · MAKERVAULT
        </Animated.Text>

        {/* Flash */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.flash, { opacity: flashOpacity }]} />

      </Animated.View>
    </View>
  );
}

// ── M LETTER ICON ─────────────────────────────────────────────────────────────

function MLetterIcon({ size }: { size: number }) {
  const s = size;
  const sw = s * 0.14; // stroke width equivalent
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      {/* Left vertical */}
      <View style={{
        position: 'absolute', left: s * 0.06, top: 0,
        width: sw, height: s, backgroundColor: '#00c8e8', borderRadius: 1,
      }} />
      {/* Right vertical */}
      <View style={{
        position: 'absolute', right: s * 0.06, top: 0,
        width: sw, height: s, backgroundColor: '#00c8e8', borderRadius: 1,
      }} />
      {/* Left diagonal */}
      <View style={{
        position: 'absolute', left: s * 0.06 + sw * 0.5, top: 0,
        width: sw, height: s * 0.56,
        backgroundColor: '#00c8e8', borderRadius: 1,
        transform: [{ rotate: '32deg' }, { translateX: s * 0.14 }],
      }} />
      {/* Right diagonal */}
      <View style={{
        position: 'absolute', right: s * 0.06 + sw * 0.5, top: 0,
        width: sw, height: s * 0.56,
        backgroundColor: '#00c8e8', borderRadius: 1,
        transform: [{ rotate: '-32deg' }, { translateX: -s * 0.14 }],
      }} />
      {/* Centre stem */}
      <View style={{
        position: 'absolute',
        left: s / 2 - sw / 2,
        top: s * 0.38,
        width: sw, height: s * 0.62,
        backgroundColor: '#00c8e8', borderRadius: 1,
      }} />
      {/* Cover the join */}
      <View style={{
        position: 'absolute',
        left: s / 2 - sw * 0.8,
        top: s * 0.34,
        width: sw * 1.6, height: sw * 1.2,
        backgroundColor: '#0a1820',
      }} />
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#04090c', zIndex: 999,
  },
  homeWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  splash: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#020609',
    alignItems: 'center', justifyContent: 'center',
  },
  gridH: {
    position: 'absolute', left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(0,80,120,0.05)',
  },
  gridV: {
    position: 'absolute', top: 0, bottom: 0, width: 1,
    backgroundColor: 'rgba(0,80,120,0.05)',
  },
  corner: {
    position: 'absolute', width: 22, height: 22,
    borderColor: 'rgba(0,200,232,0.3)', borderStyle: 'solid',
  },
  cornerTL: { top: 48, left: 28, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: 48, right: 28, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: 48, left: 28, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: 48, right: 28, borderBottomWidth: 2, borderRightWidth: 2 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  door: {
    width: DOOR_SIZE, height: DOOR_SIZE,
    backgroundColor: '#0a1820',
    borderRadius: DOOR_SIZE * 0.18,
    borderWidth: 2.5, borderColor: '#1e3a50',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  doorShimmer: {
    position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
  },
  hinge: {
    position: 'absolute', left: -5,
    width: 8, height: DOOR_SIZE * 0.16,
    backgroundColor: '#0e2030',
    borderWidth: 1, borderColor: '#1a3040',
    borderRadius: 2,
  },
  doorRing: {
    position: 'absolute',
    top: DOOR_SIZE * 0.07, left: DOOR_SIZE * 0.07,
    right: DOOR_SIZE * 0.07, bottom: DOOR_SIZE * 0.07,
    borderRadius: DOOR_SIZE * 0.12,
    borderWidth: 1, borderColor: '#0e2030',
  },
  bolt: {
    position: 'absolute', width: 8, height: 8,
    borderRadius: 4, backgroundColor: '#0e2030',
    borderWidth: 1, borderColor: '#1a3040',
    transform: [{ translateX: -4 }, { translateY: -4 }],
  },
  latchCol: {
    position: 'absolute', right: -2, top: '50%',
    transform: [{ translateY: -(DOOR_SIZE * 0.3) / 2 }],
    gap: 5,
  },
  latchTrack: {
    width: 9, height: DOOR_SIZE * 0.10,
    backgroundColor: '#0e2030',
    borderWidth: 1, borderColor: '#1a3040',
    borderRadius: 1, overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  latchFill: { width: '100%' },
  dialWrap: {
    width: DIAL_SIZE, height: DIAL_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  dialOuter: {
    width: DIAL_SIZE, height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    backgroundColor: '#060d14',
    borderWidth: 2, borderColor: '#1e3a50',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  tick: {
    position: 'absolute', top: 4,
    width: 2, height: 7,
    backgroundColor: '#1a4050',
    transformOrigin: `1px ${DIAL_SIZE / 2 - 4}px`,
  },
  dialPointer: {
    position: 'absolute', top: 0,
    width: 3, height: 10,
    backgroundColor: '#00c8e8',
    borderRadius: 0,
    left: '50%', marginLeft: -1.5,
    zIndex: 5,
  },
  dialInner: {
    width: DIAL_SIZE * 0.62, height: DIAL_SIZE * 0.62,
    borderRadius: DIAL_SIZE * 0.31,
    backgroundColor: '#0a1820',
    borderWidth: 1, borderColor: '#1a3040',
    alignItems: 'center', justifyContent: 'center',
  },
  keyholeWrap: {
    position: 'absolute', bottom: -14,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#0a1820',
    borderWidth: 2, borderColor: '#1a3040',
    alignItems: 'center', justifyContent: 'center',
  },
  keyholeCircle: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#3a7888',
    position: 'absolute', top: 4,
  },
  keyholeStem: {
    width: 4, height: 6,
    backgroundColor: '#3a7888',
    position: 'absolute', bottom: 4,
    borderRadius: 1,
  },
  nameArea: { alignItems: 'center', marginTop: 38 },
  appName: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5, color: '#e8f8fc' },
  appNameAccent: { color: '#00c8e8' },
  tagline: { fontSize: 9, color: '#3a7888', letterSpacing: 0.2, marginTop: 6 },
  nameLine: { height: 1, width: 60, marginTop: 16 },
  loadArea: { alignItems: 'center', gap: 7, marginTop: 14 },
  loadTrack: { width: 80, height: 2, backgroundColor: '#0a1820' },
  loadFill: { height: '100%', backgroundColor: '#00c8e8' },
  loadText: { fontSize: 8, color: '#1a4a5a', letterSpacing: 0.18 },
  version: {
    position: 'absolute', bottom: 52,
    fontSize: 8, color: '#1a3a48', letterSpacing: 0.14,
  },
  flash: { backgroundColor: 'white', pointerEvents: 'none' },
});
