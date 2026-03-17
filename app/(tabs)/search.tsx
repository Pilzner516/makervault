import { View, Text, ScrollView, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ScreenLayout, ScreenHeader, SearchBar,
  EngravingLabel, PanelCard, ItemRow, EmptyState,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import { supabase } from '@/lib/supabase';
import type { Part } from '@/lib/types';

interface DbCategory {
  id: string;
  name: string;
  icon: string;
  colour: string;
  sort_order: number;
}

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
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // Fetch categories from Supabase
  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (data) setCategories(data as DbCategory[]);
        setLoadingCats(false);
      });
  }, []);

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

  const getCatCount = (catName: string) => {
    const lower = catName.toLowerCase();
    return parts.filter(
      (p) => p.category?.toLowerCase().includes(lower) || p.name.toLowerCase().includes(lower)
    ).length;
  };

  const isSearching = query.trim().length > 0;

  const renderResult = useCallback(
    ({ item }: { item: Part }) => (
      <ItemRow
        iconLabel={getAbbr(item.category ?? item.name)}
        imageUri={item.image_url ?? undefined}
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

          {loadingCats ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : (
            <View style={s.grid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.75}
                  style={s.cardWrap}
                  onPress={() => router.push({ pathname: '/category/[id]' as any, params: { id: cat.id } })}
                >
                  <PanelCard style={s.catCard}>
                    <View style={[s.catIcon, { backgroundColor: cat.colour + '15', borderColor: cat.colour + '40' }]}>
                      <Ionicons name={cat.icon as any} size={24} color={cat.colour} />
                    </View>
                    <Text style={[s.catName, { color: colors.textSecondary }]}>{cat.name.toUpperCase()}</Text>
                    <Text style={[s.catCount, { color: colors.textMuted }]}>{getCatCount(cat.name)} items</Text>
                  </PanelCard>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <>
          {results.length > 0 ? (
            <>
              <EngravingLabel label={`${results.length} results for "${query}"`} />
              <FlatList
                data={results}
                renderItem={renderResult}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              />
            </>
          ) : (
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
  cardWrap: {
    width: '48%',
  },
  catCard: {
    minHeight: 80,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 0,
    marginBottom: 0,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  catCount: {
    fontSize: 14,
    marginTop: 2,
    textAlign: 'center',
  },
});
