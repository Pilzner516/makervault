import { Platform } from 'react-native';
import { useSettingsStore } from './zustand/settingsStore';

const Haptics = Platform.OS !== 'web'
  ? (require('expo-haptics') as typeof import('expo-haptics'))
  : null;

/**
 * Fire an impact haptic only when the user has hapticFeedbackEnabled turned on.
 * Safe to call on web (no-op).
 */
export function hapticImpact(style?: 'Light' | 'Medium' | 'Heavy'): void {
  if (!Haptics || !useSettingsStore.getState().hapticFeedbackEnabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle[style ?? 'Medium']);
}

/**
 * Fire a notification haptic only when the user has hapticFeedbackEnabled turned on.
 * Safe to call on web (no-op).
 */
export function hapticNotification(type?: 'Success' | 'Warning' | 'Error'): void {
  if (!Haptics || !useSettingsStore.getState().hapticFeedbackEnabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType[type ?? 'Success']);
}
