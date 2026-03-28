import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useEffect, useMemo, useCallback, useState } from 'react';
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
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAutoScanStore } from '@/lib/zustand/autoScanStore';
import { VoiceOverlay } from '@/components/VoiceOverlay';

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
  const [totalProjects, setTotalProjects] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const { loadUnconfirmed, hasUnconfirmed, captures: autoCaptures } = useAutoScanStore();
  const unconfirmedCount = autoCaptures.filter((c) => !c.confirmed && !c.discarded && (c.status === 'done' || c.status === 'processing')).length;
  const [showVoice, setShowVoice] = useState(false);

  useEffect(() => {
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => { if (count != null) setTotalProjects(count); });
    // Fetch wishlist count
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { count } = await supabase
          .from('wishlist')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        if (count != null) setWishlistCount(count);
      } catch {
        // Wishlist table may not exist yet
      }
    })();
    // Check for unconfirmed scans from previous session
    loadUnconfirmed();
  }, []);

  const handleVoice = useCallback(() => {
    setShowVoice(true);
  }, []);

  const cards: { icon: string; label: string; sub: string; route: string; highlight?: boolean }[] = [
    { icon: 'scan-outline', label: 'SCAN', sub: 'AI identify', route: '/(tabs)/scan', highlight: true },
    { icon: 'search-outline', label: 'SEARCH', sub: 'Find parts', route: '/(tabs)/search' },
    { icon: 'cube-outline', label: 'INVENTORY', sub: `${totalParts} parts`, route: '/(tabs)/inventory' },
    { icon: 'construct-outline', label: 'PROJECTS', sub: `${totalProjects} builds`, route: '/(tabs)/projects' },
    { icon: 'bookmark-outline', label: 'WISHLIST', sub: `${wishlistCount} items`, route: '/wishlist' },
    { icon: 'mic-outline', label: 'VOICE', sub: 'Hands-free', route: '__voice__' },
    { icon: 'settings-outline', label: 'SETTINGS', sub: 'Themes & more', route: '/modal' },
  ];

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <LogoHeader subtitle="Workshop OS" />

      <StatStrip>
        <StatTile value={totalParts} label="Parts" onPress={() => router.push('/(tabs)/inventory')} />
        {unconfirmedCount > 0 ? (
          <StatTile
            value={unconfirmedCount}
            label="Pending"
            color={colors.accent}
            onPress={() => router.push('/auto-scan-review' as any)}
          />
        ) : (
          <StatTile value={totalProjects} label="Projects" onPress={() => router.push('/(tabs)/projects')} />
        )}
        <StatTile value={lowStockCount} label="Alerts" color={lowStockCount > 0 ? colors.statusOut : undefined} />
      </StatStrip>

      {/* Unconfirmed scans alert */}
      {unconfirmedCount > 0 && (
        <AlertBanner
          title={`${unconfirmedCount} unconfirmed scan${unconfirmedCount !== 1 ? 's' : ''} to review`}
          subtitle="Tap to review and save to inventory"
          variant="warn"
          onPress={() => router.push('/auto-scan-review' as any)}
        />
      )}

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
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}
                  style={[s.launchLabel, { color: c.highlight ? colors.accent : colors.textSecondary }]}>
                  {c.label}
                </Text>
                <Text numberOfLines={1} style={[s.launchSub, { color: colors.textMuted }]}>{c.sub}</Text>
              </PanelCard>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <VoiceOverlay visible={showVoice} onClose={() => setShowVoice(false)} />
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
