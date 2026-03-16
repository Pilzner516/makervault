import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ScreenLayout, LogoHeader, AlertBanner,
  StatStrip, StatTile, PanelCard,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import { getLowStockParts } from '@/lib/notifications';
import { isSupabaseConfigured } from '@/lib/supabase';
import { isVoiceAvailable, startRecognition, setupVoiceListeners } from '@/lib/voice';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { parts, fetchParts } = useInventoryStore();

  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchParts().catch(() => {});
    }
  }, [fetchParts]);

  const lowStockParts = useMemo(() => getLowStockParts(parts), [parts]);
  const totalParts = parts.length;
  const lowStockCount = lowStockParts.length;
  const totalProjects = 0;

  const handleVoice = useCallback(() => {
    if (isVoiceAvailable()) {
      startRecognition();
    }
  }, []);

  const cards: { icon: string; label: string; sub: string; route: string; highlight?: boolean }[] = [
    { icon: 'scan-outline', label: 'SCAN', sub: 'AI identify', route: '/(tabs)/scan', highlight: true },
    { icon: 'search-outline', label: 'SEARCH', sub: 'Find parts', route: '/(tabs)/search' },
    { icon: 'cube-outline', label: 'INVENTORY', sub: `${totalParts} parts`, route: '/(tabs)/inventory' },
    { icon: 'construct-outline', label: 'PROJECTS', sub: `${totalProjects} builds`, route: '/(tabs)/projects' },
    { icon: 'mic-outline', label: 'VOICE', sub: 'Hands-free', route: '__voice__' },
    { icon: 'settings-outline', label: 'SETTINGS', sub: 'Themes & more', route: '/modal' },
  ];

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <LogoHeader subtitle="Workshop OS" />

      <StatStrip>
        <StatTile value={totalParts} label="Parts" onPress={() => router.push('/(tabs)/inventory')} />
        <StatTile value={totalProjects} label="Projects" onPress={() => router.push('/(tabs)/projects')} />
        <StatTile value={lowStockCount} label="Alerts" color={lowStockCount > 0 ? colors.statusOut : undefined} />
      </StatStrip>

      {lowStockCount > 0 && (
        <AlertBanner
          title={`${lowStockCount} item${lowStockCount !== 1 ? 's' : ''} need restocking`}
          subtitle="Tap to view"
          variant="danger"
          onPress={() => router.push('/(tabs)/inventory')}
        />
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={s.grid}>
          {cards.map((c) => (
            <TouchableOpacity
              key={c.label}
              activeOpacity={0.75}
              style={s.cardWrap}
              onPress={() => {
                if (c.route === '__voice__') {
                  handleVoice();
                } else {
                  router.push(c.route as any);
                }
              }}
            >
              <PanelCard style={c.highlight ? { ...s.card, borderColor: colors.accentBorder } : s.card}>
                <View style={[
                  s.launchIcon,
                  c.highlight
                    ? { borderColor: colors.accentBorder, backgroundColor: colors.accentBg }
                    : { borderColor: colors.borderDefault, backgroundColor: colors.bgDeep },
                ]}>
                  <Ionicons name={c.icon as any} size={24} color={colors.accent} />
                </View>
                <Text style={[s.launchLabel, { color: c.highlight ? colors.accent : colors.textSecondary }]}>
                  {c.label}
                </Text>
                <Text style={[s.launchSub, { color: colors.textMuted }]}>{c.sub}</Text>
              </PanelCard>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 8,
    rowGap: 8,
  },
  cardWrap: {
    width: '31.5%',
  },
  card: {
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  launchIcon: {
    width: 44,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  launchLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.04,
    textAlign: 'center',
  },
  launchSub: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 2,
  },
});
