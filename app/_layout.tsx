import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { useAuthStore } from '@/lib/zustand/authStore';
import { VoiceFAB } from '@/components/VoiceFAB';

// Force dark industrial theme
const MakerVaultTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#161616',
    card: '#0a0a0a',
    text: '#f0ede0',
    border: '#1e1e1e',
    primary: '#f0a030',
    notification: '#f05032',
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const initAuth = useAuthStore((s) => s.init);

  useEffect(() => {
    try {
      initAuth();
    } catch (e) {
      console.warn('Auth init failed:', e);
    }
  }, [initAuth]);

  return (
    <ThemeProvider value={MakerVaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="confirm" options={{ presentation: 'modal', title: 'Confirm Part', headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#f0ede0' }} />
        <Stack.Screen name="reorder" options={{ title: 'Price Compare', headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#f0ede0' }} />
        <Stack.Screen name="wishlist" options={{ title: 'Wishlist', headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#f0ede0' }} />
        <Stack.Screen name="locations" options={{ presentation: 'modal', title: 'Storage Locations', headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#f0ede0' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Settings', headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#f0ede0' }} />
      </Stack>
      <VoiceFAB />
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
