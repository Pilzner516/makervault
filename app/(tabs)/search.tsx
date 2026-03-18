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
import { useSearchStore } from '@/lib/zustand/searchStore';
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
  const { recentSearches, loadRecentSearches } = useSearchStore();
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

  // Load recent search history from Supabase
  useEffect(() => {
    loadRecentSearches();
  }, [loadRecentSearches]);

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

  // Map parent categories to likely part categories
  const CAT_KEYWORDS: Record<string, string[]> = {
    'electronics': ['resistor', 'capacitor', 'inductor', 'led', 'diode', 'transistor', 'ic', 'microcontroller', 'sensor', 'connector', 'switch', 'relay', 'crystal', 'fuse', 'display', 'module', 'cable', 'wire', 'board', 'arduino', 'raspberry', 'esp', 'power', 'voltage', 'charger', 'adapter', 'usb', 'hdmi', 'electronic'],
    'fasteners': ['bolt', 'screw', 'nut', 'washer', 'rivet', 'standoff', 'anchor', 'clip', 'pin', 'insert', 'fastener'],
    'tools': ['tool', 'hammer', 'wrench', 'screwdriver', 'plier', 'solder', 'multimeter', 'clamp', 'saw', 'drill', 'cutter', 'measure'],
    '3d printing': ['filament', 'pla', 'petg', 'abs', 'resin', 'nozzle', 'hotend', 'printer', '3d print', 'bed', 'stepper'],
    'materials': ['alumin', 'steel', 'wood', 'timber', 'acrylic', 'foam', 'adhesive', 'tape', 'sheet', 'stock', 'material', 'copper', 'pcb'],
    'mechanical': ['bearing', 'belt', 'pulley', 'spring', 'gear', 'rail', 'motor', 'coupling', 'actuator', 'servo', 'mechanical'],
    'safety & ppe': ['safety', 'glove', 'goggle', 'mask', 'respirator', 'ear', 'protection', 'ppe'],
  };

  const getCatCount = (catName: string) => {
    const lower = catName.toLowerCase();
    const keywords = CAT_KEYWORDS[lower] ?? [lower];
    return parts.filter((p) => {
      const pCat = (p.category ?? '').toLowerCase();
      const pName = p.name.toLowerCase();
      const pSub = (p.subcategory ?? '').toLowerCase();
      return keywords.some((kw) => pCat.includes(kw) || pName.includes(kw) || pSub.includes(kw)) ||
        pCat.includes(lower);
    }).length;
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
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <>
              <EngravingLabel label="Recent searches" />
              <PanelCard>
                {recentSearches.slice(0, 5).map((term, i) => (
                  <TouchableOpacity
                    key={`${term}-${i}`}
                    activeOpacity={0.75}
                    style={[
                      s.recentRow,
                      { backgroundColor: colors.bgDeep },
                      i < Math.min(recentSearches.length, 5) - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.borderSubtle,
                      },
                    ]}
                    onPress={() => setQuery(term)}
                  >
                    <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                    <Text style={[s.recentText, { color: colors.textSecondary }]}>{term}</Text>
                    <Ionicons name="arrow-forward-outline" size={14} color={colors.textDisabled} />
                  </TouchableOpacity>
                ))}
              </PanelCard>
            </>
          )}

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
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    minHeight: 44,
  },
  recentText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
});
