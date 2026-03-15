import { Platform } from 'react-native';
import type { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

let Voice: typeof import('@react-native-voice/voice').default | null = null;

// Only load on native platforms — requires dev build (not available in Expo Go)
if (Platform.OS !== 'web') {
  try {
    Voice = require('@react-native-voice/voice').default;
  } catch {
    // Graceful degradation — native module not available (e.g. Expo Go)
  }
}

type VoiceCallbacks = {
  onResult: (text: string) => void;
  onPartialResult: (text: string) => void;
  onError: (error: string) => void;
  onEnd: () => void;
};

let callbacks: VoiceCallbacks | null = null;

export function isVoiceAvailable(): boolean {
  return Voice != null;
}

export function setupVoiceListeners(cbs: VoiceCallbacks): () => void {
  if (!Voice) return () => {};

  callbacks = cbs;

  Voice.onSpeechResults = (e: SpeechResultsEvent) => {
    const text = e.value?.[0] ?? '';
    callbacks?.onResult(text);
  };

  Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
    const text = e.value?.[0] ?? '';
    callbacks?.onPartialResult(text);
  };

  Voice.onSpeechError = (e: SpeechErrorEvent) => {
    callbacks?.onError(e.error?.message ?? 'Voice recognition error');
  };

  Voice.onSpeechEnd = () => {
    callbacks?.onEnd();
  };

  return () => {
    if (Voice) {
      Voice.onSpeechResults = null as unknown as (e: SpeechResultsEvent) => void;
      Voice.onSpeechPartialResults = null as unknown as (e: SpeechResultsEvent) => void;
      Voice.onSpeechError = null as unknown as (e: SpeechErrorEvent) => void;
      Voice.onSpeechEnd = null as unknown as () => void;
    }
    callbacks = null;
  };
}

export async function startRecognition(): Promise<void> {
  if (!Voice) return;
  try {
    await Voice.start('en-US');
  } catch {
    callbacks?.onError('Failed to start voice recognition');
  }
}

export async function stopRecognition(): Promise<void> {
  if (!Voice) return;
  try {
    await Voice.stop();
  } catch {
    // Ignore stop errors
  }
}

export async function cancelRecognition(): Promise<void> {
  if (!Voice) return;
  try {
    await Voice.cancel();
  } catch {
    // Ignore cancel errors
  }
}
