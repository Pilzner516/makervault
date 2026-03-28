import { DarkTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { useAuthStore } from '@/lib/zustand/authStore';
import { useSettingsStore } from '@/lib/zustand/settingsStore';
import { VoiceFAB } from '@/components/VoiceFAB';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { VaultSplash } from '@/components/VaultSplash';

function AppLayout() {
  const { colors } = useTheme();
  const [splashDone, setSplashDone] = useState(false);

  const NavTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background:   colors.bgScreen,
      card:         colors.bgBase,
      text:         colors.textPrimary,
      border:       colors.borderDefault,
      primary:      colors.accent,
      notification: colors.statusOut,
    },
  };

  const initAuth     = useAuthStore((s) => s.init);
  const initSettings = useSettingsStore((s) => s.init);

  useEffect(() => {
    try { initAuth(); } catch (e) { console.warn('Auth init failed:', e); }
    initSettings();
  }, [initAuth, initSettings]);

  return (
    <NavThemeProvider value={NavTheme}>
      <Stack>
        <Stack.Screen name="(tabs)"    options={{ headerShown: false }} />
        <Stack.Screen name="confirm"   options={{ presentation: 'modal', title: 'Confirm Part',      headerStyle: { backgroundColor: colors.bgBase }, headerTintColor: colors.textPrimary }} />
        <Stack.Screen name="reorder"   options={{ title: 'Price Compare',                            headerStyle: { backgroundColor: colors.bgBase }, headerTintColor: colors.textPrimary }} />
        <Stack.Screen name="wishlist"  options={{ title: 'Wishlist',                                 headerStyle: { backgroundColor: colors.bgBase }, headerTintColor: colors.textPrimary }} />
        <Stack.Screen name="locations" options={{ presentation: 'modal', title: 'Storage Locations', headerStyle: { backgroundColor: colors.bgBase }, headerTintColor: colors.textPrimary }} />
        <Stack.Screen name="modal"     options={{ presentation: 'modal', title: 'Settings',          headerStyle: { backgroundColor: colors.bgBase }, headerTintColor: colors.textPrimary }} />
        <Stack.Screen name="where-to-buy" options={{ title: 'Price Check', headerStyle: { backgroundColor: colors.bgBase }, headerTintColor: colors.textPrimary }} />
        <Stack.Screen name="category/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="features" options={{ headerShown: false }} />
        <Stack.Screen name="auto-scan" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="auto-scan-review" options={{ headerShown: false }} />
        <Stack.Screen name="all-suppliers" options={{ title: 'All Suppliers', headerStyle: { backgroundColor: colors.bgBase }, headerTintColor: colors.textPrimary }} />
        <Stack.Screen name="auth" options={{ presentation: 'modal', title: 'Account', headerStyle: { backgroundColor: colors.bgBase }, headerTintColor: colors.textPrimary }} />
        <Stack.Screen name="import" options={{ presentation: 'modal', title: 'Import CSV', headerStyle: { backgroundColor: colors.bgBase }, headerTintColor: colors.textPrimary }} />
        <Stack.Screen name="qr-labels" options={{ presentation: 'modal', title: 'QR Label', headerStyle: { backgroundColor: colors.bgBase }, headerTintColor: colors.textPrimary }} />
        <Stack.Screen name="find-item" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
      {/* VoiceFAB removed — voice is now a launcher card on Home */}
      <StatusBar style="light" />

      {!splashDone && (
        <VaultSplash onComplete={() => setSplashDone(true)} />
      )}
    </NavThemeProvider>
  );
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppLayout />
    </ThemeProvider>
  );
}