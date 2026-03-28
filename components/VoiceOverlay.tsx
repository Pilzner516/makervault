import {
  View, Text, TouchableOpacity, TextInput, Modal,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useVoiceStore } from '@/lib/zustand/voiceStore';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import {
  isVoiceAvailable, setupVoiceListeners,
  startRecognition, stopRecognition,
} from '@/lib/voice';
import { stopSpeaking } from '@/lib/tts';
import { hapticImpact, hapticNotification } from '@/lib/haptics';

interface VoiceOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export function VoiceOverlay({ visible, onClose }: VoiceOverlayProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    state, transcript, partialTranscript, lastResponse,
    lastIntent, error,
    setState, setTranscript, setPartialTranscript,
    setError, processTranscript, speakResponse, reset,
  } = useVoiceStore();
  const { parts } = useInventoryStore();
  const [fallbackText, setFallbackText] = useState('');

  // Pulsing mic animation
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (state === 'listening') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.6, { duration: 900 }),
          withTiming(1, { duration: 900 }),
        ),
        -1,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 900 }),
          withTiming(0, { duration: 900 }),
        ),
        -1,
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

  // Set up voice listeners when overlay mounts
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
        const currentState = useVoiceStore.getState().state;
        if (currentState === 'listening') {
          setState('idle');
        }
      },
    });
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start listening when overlay becomes visible
  useEffect(() => {
    if (visible) {
      reset();
      startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleVoiceResult = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      try {
        const parsed = await processTranscript(text);
        const response = routeIntent(parsed.intent, parsed);
        if (response) {
          await speakResponse(response);
        } else {
          // Fallback: if no intent matched, give a helpful response
          await speakResponse(`I heard "${text}". Try asking about your inventory, like "how many resistors do I have?" or "what am I low on?"`);
        }
      } catch {
        // Gemini failed — respond with a helpful message instead of hanging
        setState('idle');
        await speakResponse(`I couldn't process that. Try asking "what parts do I have?" or "what am I low on?"`);
      }
      hapticNotification('Success');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [processTranscript, speakResponse, parts],
  );

  const routeIntent = (
    intent: string,
    parsed: ReturnType<typeof useVoiceStore.getState>['lastIntent'],
  ): string | null => {
    if (!parsed) return null;
    const partName = parsed.entities.part_name;

    switch (intent) {
      case 'query_inventory': {
        if (!partName) return 'What part are you looking for?';
        const matches = parts.filter((p) =>
          p.name.toLowerCase().includes(partName.toLowerCase()),
        );
        if (matches.length === 0) return `No ${partName} found in inventory.`;
        if (matches.length === 1)
          return `Yes, you have ${matches[0]!.quantity} ${matches[0]!.name}.`;
        return `Found ${matches.length} matching parts. Check inventory for details.`;
      }
      case 'check_quantity': {
        if (!partName) return "Which part's quantity?";
        const match = parts.find((p) =>
          p.name.toLowerCase().includes(partName.toLowerCase()),
        );
        if (!match) return `No ${partName} in inventory.`;
        return `You have ${match.quantity} ${match.name}.`;
      }
      case 'find_location': {
        if (!partName) return 'Which part are you looking for?';
        const locMatch = parts.find((p) =>
          p.name.toLowerCase().includes(partName.toLowerCase()),
        );
        if (locMatch) {
          router.push(`/part/${locMatch.id}`);
          return `Opening ${locMatch.name} — check the locations section.`;
        }
        return `No ${partName} found in inventory.`;
      }
      case 'low_stock_check': {
        const lowStock = parts.filter((p) => p.quantity <= p.low_stock_threshold);
        if (lowStock.length === 0) return 'All parts are well stocked.';
        const names = lowStock.slice(0, 3).map((p) => p.name);
        return `${lowStock.length} parts low: ${names.join(', ')}${lowStock.length > 3 ? ' and more' : ''}.`;
      }
      case 'add_part':
        router.push('/(tabs)/scan');
        return 'Opening scanner.';
      case 'get_project_ideas':
        router.push('/(tabs)/projects');
        return 'Let me show you some project ideas.';
      case 'reorder_part':
        return `Check the part detail screen to reorder ${partName ?? 'parts'}.`;
      case 'unknown':
      default: {
        // Handle common help/meta questions locally without Gemini
        const lower = (parsed.entities.part_name ?? '').toLowerCase() + ' ' + (transcript ?? '').toLowerCase();
        if (lower.includes('what can you do') || lower.includes('help') || lower.includes('commands')) {
          return `I can search your inventory, check quantities, find low stock items, open the scanner, and look up project ideas. Try "how many resistors do I have?" or "what am I low on?"`;
        }
        if (lower.includes('how many') && lower.includes('total')) {
          return `You have ${parts.length} items in your inventory.`;
        }
        if (parsed.clarification_needed && parsed.clarification_question) {
          return parsed.clarification_question;
        }
        return null;
      }
    }
  };

  const startListening = async () => {
    hapticImpact('Medium');
    if (!isVoiceAvailable()) return;
    setState('listening');
    await startRecognition();
  };

  const handleMicPress = async () => {
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
    reset();
    await startListening();
  };

  const handleTextSubmit = async () => {
    if (!fallbackText.trim()) return;
    await handleVoiceResult(fallbackText.trim());
    setFallbackText('');
  };

  const handleClose = () => {
    if (state === 'listening') {
      stopRecognition();
    }
    if (state === 'speaking') {
      stopSpeaking();
    }
    reset();
    onClose();
  };

  const stateLabel =
    state === 'listening' ? 'Listening...'
    : state === 'processing' ? 'Processing...'
    : state === 'speaking' ? 'Speaking...'
    : 'Ready';

  const micColor =
    state === 'listening' ? colors.statusOut
    : state === 'processing' ? colors.accent
    : state === 'speaking' ? colors.statusOk
    : colors.accent;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={s.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[s.backdrop, { backgroundColor: 'rgba(0,0,0,0.75)' }]}
          onPress={handleClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[s.sheet, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}
            onPress={() => {}} // prevent dismiss
          >
            {/* Close button */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={[s.closeBtn, { backgroundColor: colors.bgDeep, borderColor: colors.borderDefault }]}
              onPress={handleClose}
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Title */}
            <Text style={[s.title, { color: colors.textPrimary }]}>Voice Assistant</Text>

            {/* Pulsing mic */}
            <View style={s.micWrap}>
              {state === 'listening' && (
                <Animated.View
                  style={[s.pulseRing, { backgroundColor: micColor }, pulseStyle]}
                />
              )}
              <TouchableOpacity
                activeOpacity={0.75}
                style={[s.micBtn, { backgroundColor: micColor }]}
                onPress={handleMicPress}
              >
                <Ionicons
                  name={
                    state === 'listening' ? 'mic' :
                    state === 'processing' ? 'hourglass-outline' :
                    state === 'speaking' ? 'volume-high' :
                    'mic-outline'
                  }
                  size={32}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </View>

            {/* State label */}
            <Text style={[s.stateLabel, { color: micColor }]}>{stateLabel.toUpperCase()}</Text>

            {/* Transcript */}
            <ScrollView style={s.transcriptScroll} contentContainerStyle={s.transcriptContent}>
              {(partialTranscript || transcript) ? (
                <Text style={[s.transcript, { color: colors.textSecondary }]}>
                  {partialTranscript || transcript}
                </Text>
              ) : state === 'idle' && !lastResponse ? (
                <Text style={[s.hint, { color: colors.textFaint }]}>
                  Tap the mic or type a command below
                </Text>
              ) : null}

              {lastResponse ? (
                <View style={[s.responseBox, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.accent} />
                  <Text style={[s.responseText, { color: colors.accent }]}>{lastResponse}</Text>
                </View>
              ) : null}

              {error ? (
                <Text style={[s.errorText, { color: colors.statusOut }]}>{error}</Text>
              ) : null}
            </ScrollView>

            {/* Text input fallback */}
            {(!isVoiceAvailable() || state === 'idle') && (
              <View style={s.inputRow}>
                <TextInput
                  style={[s.textInput, {
                    backgroundColor: colors.bgDeep,
                    borderColor: colors.borderDefault,
                    color: colors.textSecondary,
                  }]}
                  placeholder="Type a command..."
                  placeholderTextColor={colors.textDisabled}
                  value={fallbackText}
                  onChangeText={setFallbackText}
                  onSubmitEditing={handleTextSubmit}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[s.sendBtn, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}
                  onPress={handleTextSubmit}
                >
                  <Ionicons name="send" size={18} color={colors.accent} />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 4,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.04,
    marginBottom: 20,
    marginTop: 4,
  },
  micWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
    marginBottom: 16,
  },
  transcriptScroll: {
    maxHeight: 160,
    width: '100%',
  },
  transcriptContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  transcript: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
  },
  responseBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%',
  },
  responseText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    lineHeight: 22,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    width: '100%',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
