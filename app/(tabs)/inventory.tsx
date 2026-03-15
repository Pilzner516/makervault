import { View, Text, TextInput, Pressable, Modal, Alert, FlatList, ActivityIndicator } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import { getLowStockParts } from '@/lib/notifications';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AddPartSheet } from '@/components/AddPartSheet';
import type { Part, NewPart } from '@/lib/types';

type SortKey = 'name' | 'category' | 'quantity' | 'updated_at';
type FilterKey = 'all' | 'low_stock' | string;

export default function InventoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { parts, isLoading, fetchParts, addPart, deletePart } = useInventoryStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [showAddSheet, setShowAddSheet] = useState(false);

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

  const renderItem = useCallback(
    ({ item }: { item: Part }) => (
      <Pressable
        className="flex-row items-center px-md py-sm"
        style={{ borderBottomWidth: 0.5, borderBottomColor: '#1e1e1e' }}
        onPress={() => router.push(`/part/${item.id}`)}
      >
        <View
          className="h-[28px] w-[28px] items-center justify-center rounded-md bg-surface"
          style={{ borderWidth: 0.5, borderColor: '#2e2e2e' }}
        >
          <Text className="text-[10px] font-medium text-text-muted">
            {getAbbr(item.category ?? item.name)}
          </Text>
        </View>
        <View className="ml-sm flex-1">
          <Text className="text-item text-text-secondary" numberOfLines={1}>{item.name}</Text>
          <Text className="text-meta text-text-muted" numberOfLines={1}>
            {[item.manufacturer, item.mpn].filter(Boolean).join(' · ') || item.category || ''}
          </Text>
        </View>
        <View className="items-end">
          {item.quantity <= item.low_stock_threshold ? (
            <View
              className="rounded-sm px-[6px] py-[2px]"
              style={{
                backgroundColor: item.quantity === 0 ? 'rgba(240,80,50,0.13)' : 'rgba(240,160,48,0.12)',
              }}
            >
              <Text
                className="text-badge"
                style={{ color: item.quantity === 0 ? '#f05032' : '#f0a030' }}
              >
                {item.quantity === 0 ? 'OUT' : `${item.quantity}`}
              </Text>
            </View>
          ) : (
            <Text className="text-item text-text-muted">{item.quantity}</Text>
          )}
        </View>
      </Pressable>
    ),
    [router]
  );

  return (
    <View className="flex-1 bg-screen" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-md pb-sm pt-xl">
        <Text className="text-title text-text-primary">Inventory</Text>
      </View>

      {/* Search bar */}
      <View
        className="mx-md mb-sm flex-row items-center rounded-md px-[10px]"
        style={{ backgroundColor: '#1a1a1a', borderWidth: 0.5, borderColor: '#2a2a2a' }}
      >
        <MaterialIcons name="search" size={16} color="#444444" />
        <TextInput
          className="ml-sm flex-1 py-[6px] text-field text-text-secondary"
          placeholder="Search parts..."
          placeholderTextColor="#555555"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={14} color="#666666" />
          </Pressable>
        )}
      </View>

      {/* Filter pills */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={['all', ...(lowStockCount > 0 ? ['low_stock'] : []), ...categories] as FilterKey[]}
        keyExtractor={(item) => item}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 6, marginBottom: 8 }}
        renderItem={({ item: cat }) => {
          const isActive = filter === cat;
          const isLow = cat === 'low_stock';
          return (
            <Pressable
              className="rounded-pill px-[7px] py-[2px]"
              style={{
                backgroundColor: isActive ? 'rgba(240,160,48,0.12)' : '#1e1e1e',
                borderWidth: 0.5,
                borderColor: isActive ? '#634010' : '#2a2a2a',
              }}
              onPress={() => setFilter(isActive ? 'all' : cat)}
            >
              <Text
                className="text-meta font-medium"
                style={{ color: isActive ? '#f0a030' : '#666666' }}
              >
                {cat === 'all' ? 'All' : isLow ? `Low (${lowStockCount})` : cat}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Loading */}
      {isLoading && (
        <View className="items-center py-xl">
          <ActivityIndicator size="small" color="#f0a030" />
        </View>
      )}

      {/* Section label */}
      {!isLoading && filteredParts.length > 0 && (
        <Text className="text-section uppercase px-md pb-[3px] text-text-ghost tracking-wider">
          {filter === 'low_stock' ? 'LOW STOCK' : filter !== 'all' ? filter.toUpperCase() : 'ALL PARTS'} · {filteredParts.length} ITEMS
        </Text>
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
            <View className="items-center py-xl px-lg">
              <MaterialIcons name="inventory" size={36} color="#555555" />
              <Text className="mt-sm text-item text-text-ghost">
                {search ? `No parts match "${search}"` : 'No parts yet'}
              </Text>
              {!search && (
                <Pressable
                  className="mt-lg rounded-md px-lg py-[9px]"
                  style={{ backgroundColor: 'rgba(240,160,48,0.12)', borderWidth: 0.5, borderColor: '#634010' }}
                  onPress={() => setShowAddSheet(true)}
                >
                  <Text className="text-input font-medium text-amber-500">Add Your First Part</Text>
                </Pressable>
              )}
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <Pressable
        className="absolute bottom-6 right-4 h-12 w-12 items-center justify-center rounded-pill"
        style={{ backgroundColor: 'rgba(240,160,48,0.12)', borderWidth: 0.5, borderColor: '#634010' }}
        onPress={() => setShowAddSheet(true)}
      >
        <MaterialIcons name="add" size={24} color="#f0a030" />
      </Pressable>

      {/* Add Part Sheet */}
      <Modal
        visible={showAddSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddSheet(false)}
      >
        <AddPartSheet onSubmit={handleAddPart} onClose={() => setShowAddSheet(false)} />
      </Modal>
    </View>
  );
}

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
