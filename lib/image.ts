import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';

const MAX_SIZE_BYTES = 1024 * 1024; // 1MB
const MAX_DIMENSION = 1024;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export async function preprocessImage(uri: string): Promise<{
  base64: string;
  uri: string;
  mimeType: string;
}> {
  // Resize to fit within MAX_DIMENSION
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  let finalUri = manipulated.uri;

  // Check file size via new File API and compress further if needed
  const file = new File(manipulated.uri);
  if (file.exists && file.size > MAX_SIZE_BYTES) {
    const recompressed = await ImageManipulator.manipulateAsync(
      manipulated.uri,
      [],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
    );
    finalUri = recompressed.uri;
  }

  // Read as base64 via the new File API (ArrayBuffer → base64)
  const finalFile = new File(finalUri);
  const buffer = await finalFile.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);

  return { base64, uri: finalUri, mimeType: 'image/jpeg' };
}

export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}
