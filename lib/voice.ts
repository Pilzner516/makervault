import { Platform } from 'react-native';

type SpeechModule = {
  start(options: { lang: string; interimResults: boolean }): void;
  stop(): void;
  abort(): void;
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  addListener(
    eventName: string,
    listener: (event: Record<string, unknown>) => void,
  ): { remove(): void };
};

let speechModule: SpeechModule | null = null;

if (Platform.OS !== 'web') {
  try {
    const mod = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule: SpeechModule;
    };
    speechModule = mod.ExpoSpeechRecognitionModule;
  } catch {
    // Not available
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
  return speechModule != null;
}

export function setupVoiceListeners(cbs: VoiceCallbacks): () => void {
  if (!speechModule) return () => {};

  callbacks = cbs;

  const resultSub = speechModule.addListener('result', (event) => {
    const results = event.results as Array<{ transcript: string }> | undefined;
    const text = results?.[0]?.transcript ?? '';
    const isFinal = event.isFinal as boolean | undefined;
    if (isFinal) {
      callbacks?.onResult(text);
    } else {
      callbacks?.onPartialResult(text);
    }
  });

  const errorSub = speechModule.addListener('error', (event) => {
    callbacks?.onError((event.error as string) ?? 'Voice recognition error');
  });

  const endSub = speechModule.addListener('end', () => {
    callbacks?.onEnd();
  });

  return () => {
    resultSub.remove();
    errorSub.remove();
    endSub.remove();
    callbacks = null;
  };
}

export async function startRecognition(): Promise<void> {
  if (!speechModule) return;
  try {
    const { granted } = await speechModule.requestPermissionsAsync();
    if (!granted) {
      callbacks?.onError('Microphone permission denied');
      return;
    }
    speechModule.start({ lang: 'en-US', interimResults: true });
  } catch {
    callbacks?.onError('Failed to start voice recognition');
  }
}

export async function stopRecognition(): Promise<void> {
  if (!speechModule) return;
  try {
    speechModule.stop();
  } catch {
    // Ignore
  }
}

export async function cancelRecognition(): Promise<void> {
  if (!speechModule) return;
  try {
    speechModule.abort();
  } catch {
    // Ignore
  }
}
