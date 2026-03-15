import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Share,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { supabase } from '@/lib/supabase';
import { openSupplierPage, getSearchUrl, SUPPLIER_CONFIGS } from '@/lib/suppliers';
import type { WishlistItem } from '@/lib/types';

export default function WishlistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('wishlist')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setItems(data as WishlistItem[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = (item: WishlistItem) => {
    Alert.alert('Remove Item', `Remove "${item.name}" from wishlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('wishlist').delete().eq('id', item.id);
          setItems((prev) => prev.filter((i) => i.id !== item.id));
        },
      },
    ]);
  };

  // Group items by preferred supplier
  const grouped: Record<string, WishlistItem[]> = {};
  for (const item of items) {
    const key = item.preferred_supplier?.toLowerCase() ?? 'other';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  const handleOpenAll = (supplierKey: string, supplierItems: WishlistItem[]) => {
    // Open each item in the supplier's search
    for (const item of supplierItems) {
      const query = item.mpn ?? item.name;
      openSupplierPage(getSearchUrl(supplierKey, query));
    }
  };

  const handleExport = async () => {
    const csv = [
      'Name,MPN,Category,Preferred Supplier,Notes',
      ...items.map(
        (i) =>
          `"${i.name}","${i.mpn ?? ''}","${i.category ?? ''}","${i.preferred_supplier ?? ''}","${i.notes ?? ''}"`
      ),
    ].join('\n');

    await Share.share({
      message: csv,
      title: 'MakerVault Wishlist',
    });
  };

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <Stack.Screen
        options={{
          title: 'Wishlist',
          headerRight: () =>
            items.length > 0 ? (
              <Pressable onPress={handleExport} className="mr-3">
                <MaterialIcons name="share" size={22} color="#0a7ea4" />
              </Pressable>
            ) : null,
        }}
      />

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialIcons name="bookmark-outline" size={48} color="#a1a1aa" />
          <Text className="mt-3 text-center text-base text-zinc-500">
            Your wishlist is empty
          </Text>
          <Text className="mt-1 text-center text-sm text-zinc-400">
            Add parts from the price comparison screen
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {/* Optimize banner */}
          <View className="mb-4 flex-row items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
            <View>
              <Text className="text-sm font-medium text-primary">
                {items.length} item{items.length !== 1 ? 's' : ''} across{' '}
                {Object.keys(grouped).length} supplier
                {Object.keys(grouped).length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Pressable
              className="rounded-lg bg-primary px-3 py-1.5"
              onPress={handleExport}
            >
              <Text className="text-xs font-medium text-white">Export CSV</Text>
            </Pressable>
          </View>

          {/* Grouped by supplier */}
          {Object.entries(grouped).map(([supplier, supplierItems]) => {
            const config =
              SUPPLIER_CONFIGS[supplier] ??
              SUPPLIER_CONFIGS[supplier.replace(/\s/g, '')];
            const displayName = config?.displayName ?? supplier;

            return (
              <View key={supplier} className="mb-4">
                <View className="mb-2 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View
                      className="mr-2 h-3 w-3 rounded-full"
                      style={{ backgroundColor: config?.color ?? '#71717a' }}
                    />
                    <Text className="text-sm font-semibold uppercase text-zinc-500">
                      {displayName} ({supplierItems.length})
                    </Text>
                  </View>
                  <Pressable
                    className="flex-row items-center gap-1 rounded-full bg-zinc-200 px-3 py-1 dark:bg-zinc-700"
                    onPress={() => handleOpenAll(supplier, supplierItems)}
                  >
                    <MaterialIcons name="open-in-new" size={14} color="#71717a" />
                    <Text className="text-xs text-zinc-600 dark:text-zinc-400">
                      Open All
                    </Text>
                  </Pressable>
                </View>

                {supplierItems.map((item) => (
                  <View
                    key={item.id}
                    className="mb-2 flex-row items-center rounded-xl bg-white px-4 py-3 dark:bg-zinc-800"
                  >
                    <View className="flex-1">
                      <Text className="text-base text-zinc-900 dark:text-zinc-100">
                        {item.name}
                      </Text>
                      {item.mpn && (
                        <Text className="text-sm text-zinc-500">{item.mpn}</Text>
                      )}
                      {item.category && (
                        <View className="mt-1 self-start rounded-full bg-primary/10 px-2 py-0.5">
                          <Text className="text-xs text-primary">
                            {item.category}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: '/reorder',
                            params: {
                              mpn: item.mpn ?? '',
                              name: item.name,
                            },
                          })
                        }
                      >
                        <MaterialIcons
                          name="shopping-cart"
                          size={20}
                          color="#0a7ea4"
                        />
                      </Pressable>
                      <Pressable onPress={() => handleDelete(item)}>
                        <MaterialIcons name="close" size={20} color="#a1a1aa" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
