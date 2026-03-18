import {
  View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ScreenLayout, ScreenHeader, PanelCard, PrimaryButton, FormField, ModeButton,
  Spacing, FontSize,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { useAuthStore } from '@/lib/zustand/authStore';

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { signIn, signUp } = useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const clearError = () => setError(null);

  const handleSignIn = async () => {
    clearError();
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }
    setIsLoading(true);
    try {
      await signIn(email.trim(), password);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    clearError();
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setIsLoading(true);
    try {
      await signUp(email.trim(), password);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Account" backLabel="Back" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: Spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: Spacing.xl }}>
            <Text style={{ fontSize: 32, fontWeight: '800', letterSpacing: 0.02 }}>
              <Text style={{ color: colors.textPrimary }}>Maker</Text>
              <Text style={{ color: colors.accent }}>Vault</Text>
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: colors.textFaint, marginTop: Spacing.xs, letterSpacing: 0.12 }}>
              WORKSHOP OS
            </Text>
          </View>

          {/* Mode tabs */}
          <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 12, marginBottom: Spacing.lg }}>
            <ModeButton label="Sign In" active={mode === 'signin'} onPress={() => { setMode('signin'); clearError(); }} />
            <ModeButton label="Sign Up" active={mode === 'signup'} onPress={() => { setMode('signup'); clearError(); }} />
          </View>

          {/* Error */}
          {error && (
            <View style={{
              marginHorizontal: 12, marginBottom: Spacing.md,
              backgroundColor: colors.statusOutBg, borderRadius: 4, borderWidth: 1,
              borderColor: colors.statusOutBorder, paddingHorizontal: 12, paddingVertical: 10,
            }}>
              <Text style={{ fontSize: FontSize.sm, color: colors.statusOut }}>{error}</Text>
            </View>
          )}

          {/* Form */}
          <PanelCard style={{ paddingVertical: Spacing.md }}>
            <FormField
              label="Email"
              value={email}
              onChangeText={(t) => { setEmail(t); clearError(); }}
              placeholder="you@example.com"
              autoCapitalize="none"
            />
            <FormField
              label="Password"
              value={password}
              onChangeText={(t) => { setPassword(t); clearError(); }}
              placeholder="Enter password"
              secureTextEntry
              autoCapitalize="none"
            />
            {mode === 'signup' && (
              <FormField
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); clearError(); }}
                placeholder="Re-enter password"
                secureTextEntry
                autoCapitalize="none"
              />
            )}
          </PanelCard>

          {/* Action button */}
          <View style={{ marginTop: Spacing.md }}>
            <PrimaryButton
              label={mode === 'signin' ? 'Sign In' : 'Sign Up'}
              icon={mode === 'signin' ? 'log-in-outline' : 'person-add-outline'}
              onPress={mode === 'signin' ? handleSignIn : handleSignUp}
              disabled={isLoading}
            />
          </View>

          {/* Continue as guest */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={{
              alignItems: 'center', justifyContent: 'center',
              paddingVertical: 14, marginHorizontal: 12, marginTop: Spacing.sm,
              minHeight: 44,
            }}
            onPress={() => router.back()}
          >
            <Text style={{ fontSize: FontSize.sm, color: colors.textMuted }}>
              Continue as guest
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}
