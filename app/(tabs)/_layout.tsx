import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#f0a030',
        tabBarInactiveTintColor: '#3a3a3a',
        tabBarStyle: {
          backgroundColor: '#0e0e0e',
          borderTopColor: '#1e1e1e',
          borderTopWidth: 0.5,
          paddingTop: 5,
          paddingBottom: insets.bottom + 6,
          height: 56 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 8,
          fontWeight: '500',
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
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <MaterialIcons name="home" size={22} color={color} />
              {focused && (
                <View style={{ width: 14, height: 2, backgroundColor: '#f0a030', borderRadius: 1, marginTop: 2 }} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <MaterialIcons name="inventory-2" size={22} color={color} />
              {focused && (
                <View style={{ width: 14, height: 2, backgroundColor: '#f0a030', borderRadius: 1, marginTop: 2 }} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <MaterialIcons name="lightbulb" size={22} color={color} />
              {focused && (
                <View style={{ width: 14, height: 2, backgroundColor: '#f0a030', borderRadius: 1, marginTop: 2 }} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <MaterialIcons name="center-focus-strong" size={22} color={color} />
              {focused && (
                <View style={{ width: 14, height: 2, backgroundColor: '#f0a030', borderRadius: 1, marginTop: 2 }} />
              )}
            </View>
          ),
        }}
      />
      {/* Hidden from tab bar — accessible via router.push */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
