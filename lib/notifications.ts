import { Platform } from 'react-native';
import type { Part } from '@/lib/types';

let Notifications: typeof import('expo-notifications') | null = null;

// expo-notifications push was removed from Expo Go in SDK 53+.
// Only initialise when running in a dev build (expo-dev-client).
try {
  if (Platform.OS !== 'web') {
    const Constants = require('expo-constants') as typeof import('expo-constants');
    const isExpoGo = Constants.default.appOwnership === 'expo';
    if (!isExpoGo) {
      Notifications = require('expo-notifications') as typeof import('expo-notifications');
      Notifications!.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  }
} catch {
  // Not available — silent fallback
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export function getLowStockParts(parts: Part[]): Part[] {
  return parts.filter((p) => p.quantity <= p.low_stock_threshold);
}

export async function sendLowStockAlert(part: Part): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Low Stock Alert',
        body: `${part.name} is low — ${part.quantity} remaining (threshold: ${part.low_stock_threshold})`,
        data: { partId: part.id },
      },
      trigger: null,
    });
  } catch {
    // Silently fail
  }
}

export async function sendLowStockDigest(parts: Part[]): Promise<void> {
  if (!Notifications) return;
  const lowStock = getLowStockParts(parts);
  if (lowStock.length === 0) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Weekly Inventory Check',
        body: `You're low on ${lowStock.length} part${lowStock.length === 1 ? '' : 's'}: ${lowStock
          .slice(0, 3)
          .map((p) => p.name)
          .join(', ')}${lowStock.length > 3 ? '...' : ''}`,
      },
      trigger: null,
    });
  } catch {
    // Silently fail
  }
}
