import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

const TAB_ICON = (focused: boolean, color: string, accentColor: string, icon: string, activeIcon: string) => (
  <View style={{ alignItems: 'center' }}>
    {focused && (
      <View style={{ width: 20, height: 2, backgroundColor: accentColor, borderRadius: 1, position: 'absolute', top: -8 }} />
    )}
    <Ionicons name={(focused ? activeIcon : icon) as any} size={22} color={color} />
  </View>
);

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarStyle: {
          backgroundColor: colors.bgBase,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 0.5,
          paddingTop: 5,
          paddingBottom: insets.bottom + 6,
          height: 56 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => TAB_ICON(focused, color, colors.accent, 'home-outline', 'home'),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => TAB_ICON(focused, color, colors.accent, 'search-outline', 'search'),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, focused }) => TAB_ICON(focused, color, colors.accent, 'scan-outline', 'scan'),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, focused }) => TAB_ICON(focused, color, colors.accent, 'cube-outline', 'cube'),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, focused }) => TAB_ICON(focused, color, colors.accent, 'construct-outline', 'construct'),
        }}
      />
      {/* Hidden — old explore screen, accessible via router.push only */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
