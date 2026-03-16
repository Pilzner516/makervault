import { View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ScreenLayout, ScreenHeader, SearchBar,
  EngravingLabel, PanelCard, ItemRow, EmptyState,
  Spacing,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import type { Part } from '@/lib/types';

interface CategoryCard {
  name: string;
  icon: string;
  filter: string;
}

const CATEGORIES: CategoryCard[] = [
  { name: 'Fasteners', icon: 'build-outline', filter: 'fastener' },
  { name: 'Electronics', icon: 'pulse-outline', filter: 'electronic' },
  { name: 'Tools', icon: 'hammer-outline', filter: 'tool' },
  { name: '3D Printing', icon: 'print-outline', filter: '3d print' },
  { name: 'Materials', icon: 'layers-outline', filter: 'material' },
  { name: 'Cables', icon: 'git-merge-outline', filter: 'cable' },
];

function getAbbr(text: string): string {
  const abbrs: Record<string, string> = {
    resistor: 'RES', capacitor: 'CAP', inductor: 'IND', led: 'LED',
    transistor: 'TRN', diode: 'DIO', ic: 'IC', microcontroller: 'MCU',
    sensor: 'SNS', motor: 'MOT', cable: 'CBL', connector: 'CON',
    fastener: 'FST', tool: 'TL', material: 'MAT',
  };
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(abbrs)) {
    if (lower.includes(key)) return val;
  }
  return text.slice(0, 3).toUpperCase();
}

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { parts } = useInventoryStore();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return parts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.manufacturer?.toLowerCase().includes(q) ?? false) ||
        (p.mpn?.toLowerCase().includes(q) ?? false) ||
        (p.category?.toLowerCase().includes(q) ?? false) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        (p.notes?.toLowerCase().includes(q) ?? false)
    );
  }, [parts, query]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      counts[cat.filter] = parts.filter(
        (p) => p.category?.toLowerCase().includes(cat.filter) || p.name.toLowerCase().includes(cat.filter)
      ).length;
    }
    return counts;
  }, [parts]);

  const handleCategoryPress = (filter: string) => {
    setQuery(filter);
  };

  const isSearching = query.trim().length > 0;

  const renderResult = useCallback(
    ({ item }: { item: Part }) => (
      <ItemRow
        iconLabel={getAbbr(item.category ?? item.name)}
        name={item.name}
        meta={[item.category, item.manufacturer].filter(Boolean).join(' · ') || undefined}
        rightText={String(item.quantity)}
        status={item.quantity === 0 ? 'out' : item.quantity <= item.low_stock_threshold ? 'low' : 'none'}
        onPress={() => router.push(`/part/${item.id}`)}
      />
    ),
    [router]
  );

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <ScreenHeader title="Search" subtitle={`${parts.length} items in vault`} />

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search items, categories, projects…"
      />

      {!isSearching ? (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <EngravingLabel label="Browse by category" />

          <View style={s.grid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.name}
                activeOpacity={0.75}
                onPress={() => handleCategoryPress(cat.filter)}
                style={{ width: '48%' }}
              >
                <PanelCard style={s.catCard}>
                  <View style={[s.catIcon, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
                    <Ionicons name={cat.icon as any} size={20} color={colors.accent} />
                  </View>
                  <Text style={[s.catName, { color: colors.textSecondary }]}>{cat.name.toUpperCase()}</Text>
                  <Text style={[s.catCount, { color: colors.textMuted }]}>{categoryCounts[cat.filter] ?? 0} items</Text>
                </PanelCard>
              </TouchableOpacity>
            ))}

            {/* + New category card */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/inventory')}
              style={{ width: '48%' }}
            >
              <View style={[s.newCatCard, { borderColor: colors.borderDefault }]}>
                <Ionicons name="add" size={24} color={colors.textMuted} />
                <Text style={[s.catName, { color: colors.textMuted }]}>NEW CATEGORY</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <>
          {results.length > 0 && (
            <>
              <EngravingLabel label={`${results.length} results for "${query}"`} />
              <FlatList
                data={results}
                renderItem={renderResult}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              />
            </>
          )}

          {results.length === 0 && (
            <EmptyState
              icon="search-outline"
              title={`NO RESULTS FOR "${query.toUpperCase()}"`}
              subtitle="Try a different search term or browse by category"
              actionLabel="Clear search"
              onAction={() => setQuery('')}
            />
          )}
        </>
      )}
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    gap: 8,
  },
  catCard: {
    minHeight: 72,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginHorizontal: 0,
    marginBottom: 0,
  },
  catIcon: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
  },
  catCount: {
    fontSize: 14,
    marginTop: 2,
  },
  newCatCard: {
    minHeight: 72,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 4,
  },
});
