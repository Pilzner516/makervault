import { View, Text, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuthStore } from '@/lib/zustand/authStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { requestNotificationPermissions } from '@/lib/notifications';
import { useState } from 'react';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      setNotificationsEnabled(granted);
    } else {
      setNotificationsEnabled(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut().catch(() => {}) },
    ]);
  };

  return (
    <View className="flex-1 bg-screen">
      <Stack.Screen options={{ title: 'Settings', headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#f0ede0' }} />
      <ScrollView className="flex-1 px-md pt-lg" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Account */}
        <Text className="text-section uppercase pb-[3px] text-text-ghost tracking-wider mb-sm">
          ACCOUNT
        </Text>
        <View className="rounded-lg bg-card mb-lg" style={{ borderWidth: 0.5, borderColor: '#2a2a2a' }}>
          {user ? (
            <>
              <View className="flex-row items-center px-md py-sm" style={{ borderBottomWidth: 0.5, borderBottomColor: '#1e1e1e' }}>
                <MaterialIcons name="person" size={18} color="#f0a030" />
                <View className="ml-sm">
                  <Text className="text-item text-text-secondary">{user.email}</Text>
                  <Text className="text-meta text-text-muted">Signed in</Text>
                </View>
              </View>
              <Pressable className="flex-row items-center px-md py-sm" onPress={handleSignOut}>
                <MaterialIcons name="logout" size={18} color="#f05032" />
                <Text className="ml-sm text-item text-status-out">Sign Out</Text>
              </Pressable>
            </>
          ) : (
            <View className="flex-row items-center px-md py-sm">
              <MaterialIcons name="person-outline" size={18} color="#666666" />
              <View className="ml-sm">
                <Text className="text-item text-text-secondary">Not signed in</Text>
                <Text className="text-meta text-text-muted">
                  {isSupabaseConfigured() ? 'Sign in to sync across devices' : 'Configure Supabase to enable sync'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Notifications */}
        <Text className="text-section uppercase pb-[3px] text-text-ghost tracking-wider mb-sm">
          NOTIFICATIONS
        </Text>
        <View className="rounded-lg bg-card mb-lg" style={{ borderWidth: 0.5, borderColor: '#2a2a2a' }}>
          <View className="flex-row items-center justify-between px-md py-sm">
            <View className="flex-row items-center">
              <MaterialIcons name="notifications-none" size={18} color="#888888" />
              <Text className="ml-sm text-item text-text-secondary">Low Stock Alerts</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ true: '#f0a030', false: '#2e2e2e' }}
              thumbColor="#f0ede0"
            />
          </View>
        </View>

        {/* About */}
        <Text className="text-section uppercase pb-[3px] text-text-ghost tracking-wider mb-sm">
          ABOUT
        </Text>
        <View className="rounded-lg bg-card mb-lg" style={{ borderWidth: 0.5, borderColor: '#2a2a2a' }}>
          <FieldRow label="Version" value="1.0.0" />
          <FieldRow label="Supabase" value={isSupabaseConfigured() ? 'Connected' : 'Not configured'} />
          <FieldRow label="AI Vision" value={process.env.EXPO_PUBLIC_GEMINI_API_KEY ? 'Ready' : 'Not configured'} last />
        </View>
      </ScrollView>
    </View>
  );
}

function FieldRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View
      className="flex-row items-center justify-between px-md py-[7px]"
      style={last ? undefined : { borderBottomWidth: 0.5, borderBottomColor: '#1e1e1e' }}
    >
      <Text className="text-input text-text-muted">{label}</Text>
      <Text className="text-input text-text-secondary">{value}</Text>
    </View>
  );
}
