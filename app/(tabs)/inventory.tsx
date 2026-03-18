import { View, Modal, Alert, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ScreenLayout, ScreenHeader, SearchBar,
  FilterPillRow, FilterPill, EngravingLabel,
  PanelCard, ItemRow, EmptyState,
  Spacing, Radius,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import { getLowStockParts } from '@/lib/notifications';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AddPartSheet } from '@/components/AddPartSheet';
import type { Part, NewPart } from '@/lib/types';

type SortKey = 'name' | 'category' | 'quantity' | 'updated_at';
type FilterKey = 'all' | 'low_stock' | string;

function getAbbr(text: string): string {
  const abbrs: Record<string, string> = {
    resistor: 'RES', capacitor: 'CAP', inductor: 'IND', led: 'LED',
    transistor: 'TRN', diode: 'DIO', ic: 'IC', microcontroller: 'MCU',
    sensor: 'SNS', motor: 'MOT', cable: 'CBL', connector: 'CON',
  };
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(abbrs)) {
    if (lower.includes(key)) return val;
  }
  return text.slice(0, 3).toUpperCase();
}

export default function InventoryScreen() {
  const router = useRouter();
  const { filterCategory } = useLocalSearchParams<{ filterCategory?: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { parts, isLoading, fetchParts, addPart, deletePart } = useInventoryStore();
  const [search, setSearch] = useState(filterCategory ?? '');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [showAddSheet, setShowAddSheet] = useState(false);

  // Apply filter from category drill-down
  useEffect(() => {
    if (filterCategory) setSearch(filterCategory);
  }, [filterCategory]);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchParts().catch(() => {});
    }
  }, [fetchParts]);

  const categories = useMemo(() => {
    const cats = new Set(parts.map((p) => p.category).filter(Boolean) as string[]);
    return Array.from(cats).sort();
  }, [parts]);

  const lowStockCount = useMemo(() => getLowStockParts(parts).length, [parts]);

  const uniqueLocations = useMemo(() => {
    const locs = new Set(parts.map((p) => p.category).filter(Boolean));
    return locs.size;
  }, [parts]);

  const filteredParts = useMemo(() => {
    let result = [...parts];

    if (filter === 'low_stock') {
      result = result.filter((p) => p.quantity <= p.low_stock_threshold);
    } else if (filter !== 'all') {
      result = result.filter((p) => p.category === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.manufacturer?.toLowerCase().includes(q) ?? false) ||
          (p.mpn?.toLowerCase().includes(q) ?? false) ||
          (p.category?.toLowerCase().includes(q) ?? false) ||
          (p.description?.toLowerCase().includes(q) ?? false)
      );
    }

    result.sort((a, b) => {
      switch (sortKey) {
        case 'name': return a.name.localeCompare(b.name);
        case 'category': return (a.category ?? '').localeCompare(b.category ?? '');
        case 'quantity': return a.quantity - b.quantity;
        default: return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return result;
  }, [parts, filter, search, sortKey]);

  const handleAddPart = useCallback(
    async (newPart: NewPart) => {
      try {
        await addPart(newPart);
        setShowAddSheet(false);
      } catch {
        Alert.alert('Error', 'Failed to add part. Check your connection.');
      }
    },
    [addPart]
  );

  const filterKeys: FilterKey[] = useMemo(() => {
    const keys: FilterKey[] = ['all'];
    if (lowStockCount > 0) keys.push('low_stock');
    keys.push(...categories);
    return keys;
  }, [lowStockCount, categories]);

  const getFilterLabel = (key: FilterKey): string => {
    if (key === 'all') return 'All';
    if (key === 'low_stock') return `Low (${lowStockCount})`;
    return key;
  };

  const renderItem = useCallback(
    ({ item }: { item: Part }) => {
      const badge: 'ok' | 'low' | 'out' | undefined =
        item.quantity === 0 ? 'out' : item.quantity <= item.low_stock_threshold ? 'low' : undefined;
      const badgeLabel =
        item.quantity === 0 ? undefined : item.quantity <= item.low_stock_threshold ? `${item.quantity} left` : undefined;

      return (
        <ItemRow
          iconLabel={getAbbr(item.category ?? item.name)}
          imageUri={item.image_url ?? undefined}
          name={item.name}
          meta={[item.manufacturer, item.mpn].filter(Boolean).join(' \u00B7 ') || item.category || undefined}
          badge={badge}
          badgeLabel={badgeLabel}
          rightText={!badge ? String(item.quantity) : undefined}
          status="none"
          onPress={() => router.push(`/part/${item.id}`)}
        />
      );
    },
    [router]
  );

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="Inventory"
        subtitle={`${parts.length} items \u00B7 ${categories.length} categories`}
        rightElement={
          <TouchableOpacity onPress={() => setShowAddSheet(true)} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
          </TouchableOpacity>
        }
      />

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search parts\u2026" />

      <FilterPillRow>
        {filterKeys.map((key) => (
          <FilterPill
            key={key}
            label={getFilterLabel(key)}
            active={filter === key}
            onPress={() => setFilter(filter === key ? 'all' : key)}
          />
        ))}
      </FilterPillRow>

      {/* Loading */}
      {isLoading && (
        <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      )}

      {/* Section label */}
      {!isLoading && filteredParts.length > 0 && (
        <EngravingLabel
          label={`${filter === 'low_stock' ? 'Low stock' : filter !== 'all' ? filter : 'All parts'} \u00B7 ${filteredParts.length} items`}
        />
      )}

      {/* Part list */}
      <FlatList
        data={filteredParts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        onRefresh={() => { fetchParts().catch(() => {}); }}
        refreshing={isLoading}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="cube-outline"
              title={search ? `No parts match "${search}"` : 'No parts yet'}
              subtitle={!search ? 'Scan a component or add parts manually' : undefined}
              actionLabel={!search ? 'Add Your First Part' : undefined}
              onAction={!search ? () => setShowAddSheet(true) : undefined}
            />
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 16,
          right: 16,
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.accentBg,
          borderWidth: 0.5,
          borderColor: colors.accentBorder,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={() => setShowAddSheet(true)}
      >
        <Ionicons name="add" size={24} color={colors.accent} />
      </TouchableOpacity>

      {/* Add Part Sheet */}
      <Modal
        visible={showAddSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddSheet(false)}
      >
        <AddPartSheet onSubmit={handleAddPart} onClose={() => setShowAddSheet(false)} />
      </Modal>
    </ScreenLayout>
  );
}
