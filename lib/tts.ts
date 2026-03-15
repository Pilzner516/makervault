import * as Speech from 'expo-speech';

let isSpeaking = false;

export async function speak(text: string): Promise<void> {
  if (isSpeaking) {
    Speech.stop();
  }

  return new Promise<void>((resolve) => {
    isSpeaking = true;
    Speech.speak(text, {
      language: 'en-US',
      rate: 1.0,
      onDone: () => {
        isSpeaking = false;
        resolve();
      },
      onStopped: () => {
        isSpeaking = false;
        resolve();
      },
      onError: () => {
        isSpeaking = false;
        resolve();
      },
    });
  });
}

export function stopSpeaking(): void {
  Speech.stop();
  isSpeaking = false;
}

export function getIsSpeaking(): boolean {
  return isSpeaking;
}
