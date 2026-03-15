import { View, Text, Pressable, Modal, TextInput, ScrollView, Platform } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

// expo-haptics is native-only — no-op on web
const Haptics = Platform.OS !== 'web'
  ? require('expo-haptics') as typeof import('expo-haptics')
  : null;
import { useRouter } from 'expo-router';
import { useVoiceStore } from '@/lib/zustand/voiceStore';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import {
  isVoiceAvailable,
  setupVoiceListeners,
  startRecognition,
  stopRecognition,
} from '@/lib/voice';
import { stopSpeaking } from '@/lib/tts';

export function VoiceFAB() {
  const router = useRouter();
  const {
    state,
    transcript,
    partialTranscript,
    lastResponse,
    lastIntent,
    ambientMode,
    error,
    setState,
    setTranscript,
    setPartialTranscript,
    setError,
    toggleAmbientMode,
    processTranscript,
    speakResponse,
    reset,
  } = useVoiceStore();

  const { parts } = useInventoryStore();
  const [showOverlay, setShowOverlay] = useState(false);
  const [fallbackText, setFallbackText] = useState('');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pulse animation for listening state
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (state === 'listening') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800 }),
          withTiming(0, { duration: 800 })
        ),
        -1
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = 1;
      pulseOpacity.value = 0;
    }
  }, [state, pulseScale, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Set up voice listeners
  useEffect(() => {
    if (!isVoiceAvailable()) return;

    const cleanup = setupVoiceListeners({
      onResult: (text) => {
        setTranscript(text);
        setPartialTranscript('');
        handleVoiceResult(text);
      },
      onPartialResult: (text) => {
        setPartialTranscript(text);
      },
      onError: (err) => {
        setError(err);
        setState('idle');
      },
      onEnd: () => {
        if (state === 'listening') {
          setState('idle');
        }
      },
    });

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVoiceResult = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const parsed = await processTranscript(text);

      // Route intent to handler
      const response = await routeIntent(parsed.intent, parsed);

      if (response) {
        await speakResponse(response);
      }

      Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [processTranscript, speakResponse, parts]
  );

  const routeIntent = async (
    intent: string,
    parsed: ReturnType<typeof useVoiceStore.getState>['lastIntent']
  ): Promise<string | null> => {
    if (!parsed) return null;

    const partName = parsed.entities.part_name;

    switch (intent) {
      case 'query_inventory': {
        if (!partName) return "What part are you looking for?";
        const matches = parts.filter((p) =>
          p.name.toLowerCase().includes(partName.toLowerCase())
        );
        if (matches.length === 0) return `No ${partName} found in inventory.`;
        if (matches.length === 1)
          return `Yes, you have ${matches[0]!.quantity} ${matches[0]!.name}.`;
        return `Found ${matches.length} matching parts. Check inventory for details.`;
      }

      case 'check_quantity': {
        if (!partName) return "Which part's quantity?";
        const match = parts.find((p) =>
          p.name.toLowerCase().includes(partName.toLowerCase())
        );
        if (!match) return `No ${partName} in inventory.`;
        return `You have ${match.quantity} ${match.name}.`;
      }

      case 'find_location':
        if (!partName) return "Which part are you looking for?";
        return `Check the part detail screen for ${partName}'s location.`;

      case 'low_stock_check': {
        const lowStock = parts.filter(
          (p) => p.quantity <= p.low_stock_threshold
        );
        if (lowStock.length === 0) return "All parts are well stocked.";
        const names = lowStock.slice(0, 3).map((p) => p.name);
        return `${lowStock.length} parts low: ${names.join(', ')}${
          lowStock.length > 3 ? ' and more' : ''
        }.`;
      }

      case 'add_part':
        router.push('/(tabs)/scan');
        return "Opening scanner.";

      case 'get_project_ideas':
        router.push('/(tabs)/explore');
        return "Let me show you some project ideas.";

      case 'reorder_part':
        return `Check the part detail screen to reorder ${partName ?? 'parts'}.`;

      default:
        if (parsed.clarification_needed && parsed.clarification_question) {
          return parsed.clarification_question;
        }
        return null;
    }
  };

  const handlePress = async () => {
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (state === 'listening') {
      await stopRecognition();
      setState('idle');
      return;
    }

    if (state === 'speaking') {
      stopSpeaking();
      setState('idle');
      return;
    }

    if (!isVoiceAvailable()) {
      // Fallback: open text input overlay
      setShowOverlay(true);
      return;
    }

    reset();
    setShowOverlay(true);
    setState('listening');
    await startRecognition();
  };

  const handleLongPressIn = () => {
    longPressTimer.current = setTimeout(() => {
      Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toggleAmbientMode();
    }, 1000);
  };

  const handleLongPressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTextSubmit = async () => {
    if (!fallbackText.trim()) return;
    setShowOverlay(true);
    await handleVoiceResult(fallbackText.trim());
    setFallbackText('');
  };

  const iconName =
    state === 'listening'
      ? 'mic'
      : state === 'processing'
        ? 'hourglass-top'
        : state === 'speaking'
          ? 'volume-up'
          : 'mic-none';

  const bgColors: Record<string, string> = {
    listening: '#f05032',
    processing: '#f0a030',
    speaking: '#32b464',
    idle: '#f0a030',
  };
  const bgColor = bgColors[state] ?? '#f0a030';

  return (
    <>
      {/* Ambient mode indicator */}
      {ambientMode && (
        <View className="absolute left-0 right-0 top-0 z-50 h-1 bg-red-500" />
      )}

      {/* FAB button */}
      <View className="absolute bottom-24 right-5 z-50">
        {/* Pulse ring */}
        {state === 'listening' && (
          <Animated.View
            className="absolute h-14 w-14 rounded-full bg-red-500"
            style={pulseStyle}
          />
        )}

        <Pressable
          className="h-14 w-14 items-center justify-center rounded-full shadow-lg"
          style={{ backgroundColor: bgColor }}
          onPress={handlePress}
          onPressIn={handleLongPressIn}
          onPressOut={handleLongPressOut}
        >
          <MaterialIcons name={iconName} size={26} color="#ffffff" />
        </Pressable>
      </View>

      {/* Transcript overlay */}
      <Modal
        visible={showOverlay}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowOverlay(false);
          reset();
        }}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => {
            setShowOverlay(false);
            reset();
          }}
        >
          <Pressable
            className="rounded-t-3xl px-5 pb-8 pt-5"
            style={{ backgroundColor: '#1e1e1e' }}
            onPress={() => {}} // Prevent dismiss when tapping content
          >
            {/* State indicator */}
            <View className="mb-4 flex-row items-center justify-center gap-2">
              <MaterialIcons
                name={iconName}
                size={20}
                color={state === 'listening' ? '#ef4444' : '#0a7ea4'}
              />
              <Text className="text-sm font-medium text-zinc-500 capitalize">
                {state === 'idle' ? 'ready' : state}
              </Text>
            </View>

            {/* Transcript display */}
            <ScrollView className="max-h-40">
              {(transcript || partialTranscript) && (
                <Text className="text-center text-lg text-zinc-900 dark:text-zinc-100">
                  {transcript || partialTranscript}
                </Text>
              )}
              {lastResponse && (
                <View className="mt-3 rounded-lg bg-primary/10 px-3 py-2">
                  <Text className="text-center text-base text-primary">
                    {lastResponse}
                  </Text>
                </View>
              )}
              {error && (
                <Text className="mt-2 text-center text-sm text-danger">
                  {error}
                </Text>
              )}
            </ScrollView>

            {/* Text input fallback */}
            {(!isVoiceAvailable() || state === 'idle') && (
              <View className="mt-4 flex-row items-center gap-2">
                <TextInput
                  className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="Type a command..."
                  placeholderTextColor="#a1a1aa"
                  value={fallbackText}
                  onChangeText={setFallbackText}
                  onSubmitEditing={handleTextSubmit}
                  returnKeyType="send"
                />
                <Pressable
                  className="rounded-lg bg-primary px-4 py-2.5"
                  onPress={handleTextSubmit}
                >
                  <MaterialIcons name="send" size={20} color="#fff" />
                </Pressable>
              </View>
            )}

            {/* Action buttons */}
            <View className="mt-4 flex-row justify-center gap-4">
              {state === 'idle' && isVoiceAvailable() && (
                <Pressable
                  className="flex-row items-center gap-1.5 rounded-full bg-red-500 px-5 py-2.5"
                  onPress={handlePress}
                >
                  <MaterialIcons name="mic" size={18} color="#fff" />
                  <Text className="text-sm font-medium text-white">
                    Tap to Speak
                  </Text>
                </Pressable>
              )}
              <Pressable
                className="rounded-full bg-zinc-200 px-5 py-2.5 dark:bg-zinc-700"
                onPress={() => {
                  setShowOverlay(false);
                  reset();
                }}
              >
                <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Close
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
