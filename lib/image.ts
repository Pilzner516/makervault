import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

export interface ImageQualityOptions {
  width?: number;      // default 1024
  quality?: number;    // 0-1, default 0.8
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export async function preprocessImage(uri: string, opts?: ImageQualityOptions): Promise<{
  base64: string;
  uri: string;
  mimeType: string;
}> {
  const width = opts?.width ?? 1024;
  const quality = opts?.quality ?? 0.8;

  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
  );

  const finalUri = manipulated.uri;

  // Convert to base64 — different paths for web vs native
  let base64: string;

  if (Platform.OS === 'web') {
    // Web: fetch as blob, read as base64 via FileReader
    const response = await fetch(finalUri);
    const blob = await response.blob();
    base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // Strip the data:...;base64, prefix
        resolve(dataUrl.split(',')[1] ?? '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    // Native: use expo-file-system File API
    const { File } = require('expo-file-system') as typeof import('expo-file-system');
    const file = new File(finalUri);
    const buffer = await file.arrayBuffer();
    base64 = arrayBufferToBase64(buffer);
  }

  return { base64, uri: finalUri, mimeType: 'image/jpeg' };
}

/**
 * Create a tiny thumbnail data URI suitable for storing in the database.
 * 200px wide, 25% JPEG quality → typically 5-15KB as base64.
 */
export async function createThumbnailDataUri(uri: string): Promise<string> {
  const thumb = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 200 } }],
    { compress: 0.25, format: ImageManipulator.SaveFormat.JPEG }
  );

  let base64: string;

  if (Platform.OS === 'web') {
    const response = await fetch(thumb.uri);
    const blob = await response.blob();
    base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1] ?? '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    const { File } = require('expo-file-system') as typeof import('expo-file-system');
    const file = new File(thumb.uri);
    const buffer = await file.arrayBuffer();
    base64 = arrayBufferToBase64(buffer);
  }

  return `data:image/jpeg;base64,${base64}`;
}

export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}
