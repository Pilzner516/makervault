import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { supabase } from '@/lib/supabase';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import { sendLowStockAlert } from '@/lib/notifications';
import { QuantityAdjuster } from '@/components/QuantityAdjuster';
import type { Part, PartLocation, StorageLocation, PartSupplierLink, Supplier } from '@/lib/types';

interface LocationWithName extends PartLocation {
  location: StorageLocation;
}

interface SupplierLinkWithName extends PartSupplierLink {
  supplier: Supplier;
}

export default function PartDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { parts, updatePart, deletePart } = useInventoryStore();

  const part = parts.find((p) => p.id === id);
  const [locations, setLocations] = useState<LocationWithName[]>([]);
  const [supplierLinks, setSupplierLinks] = useState<SupplierLinkWithName[]>([]);

  useEffect(() => {
    if (!id) return;

    // Fetch locations for this part
    supabase
      .from('part_locations')
      .select('*, storage_locations(*)')
      .eq('part_id', id)
      .then(({ data }) => {
        if (data) {
          setLocations(
            data.map((pl: Record<string, unknown>) => ({
              ...(pl as unknown as PartLocation),
              location: pl.storage_locations as unknown as StorageLocation,
            }))
          );
        }
      });

    // Fetch supplier links
    supabase
      .from('part_supplier_links')
      .select('*, suppliers(*)')
      .eq('part_id', id)
      .then(({ data }) => {
        if (data) {
          setSupplierLinks(
            data.map((sl: Record<string, unknown>) => ({
              ...(sl as unknown as PartSupplierLink),
              supplier: sl.suppliers as unknown as Supplier,
            }))
          );
        }
      });
  }, [id]);

  const handleQuantityChange = useCallback(
    async (newQuantity: number) => {
      if (!part) return;
      await updatePart(part.id, { quantity: newQuantity });

      // Check low stock
      if (newQuantity <= part.low_stock_threshold && newQuantity < part.quantity) {
        sendLowStockAlert({ ...part, quantity: newQuantity }).catch(() => {});
      }
    },
    [part, updatePart]
  );

  const handleDelete = () => {
    if (!part) return;
    Alert.alert('Delete Part', `Remove "${part.name}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePart(part.id);
          router.back();
        },
      },
    ]);
  };

  if (!part) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Stack.Screen options={{ title: 'Part Not Found' }} />
        <MaterialIcons name="error-outline" size={48} color="#a1a1aa" />
        <Text className="mt-3 text-base text-zinc-400">Part not found</Text>
        <Pressable className="mt-4" onPress={() => router.back()}>
          <Text className="text-primary">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isLowStock = part.quantity <= part.low_stock_threshold;

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <Stack.Screen
        options={{
          title: part.name,
          headerRight: () => (
            <Pressable onPress={handleDelete} className="mr-2">
              <MaterialIcons name="delete-outline" size={24} color="#ef4444" />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Image */}
        {part.image_url && (
          <Image
            source={{ uri: part.image_url }}
            className="h-56 w-full bg-zinc-200 dark:bg-zinc-800"
            contentFit="cover"
          />
        )}

        {/* Quantity section */}
        <View className="mx-4 mt-4 rounded-xl bg-white p-5 dark:bg-zinc-800">
          <Text className="mb-3 text-center text-sm font-medium text-zinc-500">
            Quantity
          </Text>
          <QuantityAdjuster
            quantity={part.quantity}
            onChange={handleQuantityChange}
          />
          {isLowStock && (
            <View className="mt-3 flex-row items-center justify-center rounded-lg bg-warning/10 px-3 py-2">
              <MaterialIcons name="warning" size={16} color="#f59e0b" />
              <Text className="ml-1.5 text-sm font-medium text-warning">
                Below low-stock threshold ({part.low_stock_threshold})
              </Text>
            </View>
          )}
        </View>

        {/* Part details */}
        <View className="mx-4 mt-3 rounded-xl bg-white p-5 dark:bg-zinc-800">
          <Text className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Details
          </Text>

          <DetailRow label="Name" value={part.name} />
          {part.manufacturer && (
            <DetailRow label="Manufacturer" value={part.manufacturer} />
          )}
          {part.mpn && <DetailRow label="MPN" value={part.mpn} />}
          {part.category && (
            <DetailRow label="Category" value={part.category} />
          )}
          {part.subcategory && (
            <DetailRow label="Subcategory" value={part.subcategory} />
          )}
          {part.description && (
            <DetailRow label="Description" value={part.description} />
          )}

          {/* Specs */}
          {part.specs && Object.keys(part.specs).length > 0 && (
            <View className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-700">
              <Text className="mb-2 text-sm font-medium text-zinc-500">Specs</Text>
              {Object.entries(part.specs).map(([key, val]) => (
                <DetailRow key={key} label={key} value={String(val)} />
              ))}
            </View>
          )}
        </View>

        {/* Storage locations */}
        <View className="mx-4 mt-3 rounded-xl bg-white p-5 dark:bg-zinc-800">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Storage Locations
            </Text>
            <Pressable onPress={() => router.push('/locations')}>
              <Text className="text-sm text-primary">Manage</Text>
            </Pressable>
          </View>
          {locations.length === 0 ? (
            <Text className="text-sm text-zinc-400">No locations assigned</Text>
          ) : (
            locations.map((pl) => (
              <View
                key={pl.id}
                className="flex-row items-center justify-between border-b border-zinc-100 py-2.5 last:border-b-0 dark:border-zinc-700"
              >
                <View className="flex-row items-center">
                  <MaterialIcons name="inventory-2" size={18} color="#71717a" />
                  <Text className="ml-2 text-base text-zinc-900 dark:text-zinc-100">
                    {pl.location.name}
                  </Text>
                </View>
                <Text className="text-sm text-zinc-500">
                  {pl.quantity} here
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Supplier links */}
        {supplierLinks.length > 0 && (
          <View className="mx-4 mt-3 rounded-xl bg-white p-5 dark:bg-zinc-800">
            <Text className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Suppliers
            </Text>
            {supplierLinks.map((sl) => (
              <Pressable
                key={sl.id}
                className="flex-row items-center justify-between border-b border-zinc-100 py-3 last:border-b-0 dark:border-zinc-700"
                onPress={() => {
                  if (sl.product_url) Linking.openURL(sl.product_url);
                }}
              >
                <View>
                  <Text className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                    {sl.supplier.name}
                  </Text>
                  {sl.supplier_part_number && (
                    <Text className="text-sm text-zinc-500">
                      {sl.supplier_part_number}
                    </Text>
                  )}
                </View>
                <View className="flex-row items-center gap-3">
                  {sl.last_price != null && (
                    <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      ${sl.last_price.toFixed(2)}
                    </Text>
                  )}
                  {sl.in_stock != null && (
                    <View
                      className={`rounded-full px-2 py-0.5 ${
                        sl.in_stock ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          sl.in_stock ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {sl.in_stock ? 'In Stock' : 'Out'}
                      </Text>
                    </View>
                  )}
                  <MaterialIcons name="open-in-new" size={18} color="#0a7ea4" />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Datasheet link */}
        {part.datasheet_url && (
          <Pressable
            className="mx-4 mt-3 flex-row items-center justify-center rounded-xl bg-white p-4 dark:bg-zinc-800"
            onPress={() => Linking.openURL(part.datasheet_url!)}
          >
            <MaterialIcons name="description" size={20} color="#0a7ea4" />
            <Text className="ml-2 text-base font-medium text-primary">
              View Datasheet
            </Text>
          </Pressable>
        )}

        {/* Action buttons */}
        <View className="mx-4 mt-3 flex-row gap-3">
          <Pressable
            className="flex-1 flex-row items-center justify-center rounded-xl bg-primary py-3.5"
            onPress={() => {
              // TODO: Navigate to project picker
              Alert.alert('Coming Soon', 'Use in project feature is coming soon.');
            }}
          >
            <MaterialIcons name="build" size={18} color="#ffffff" />
            <Text className="ml-2 font-semibold text-white">Use in Project</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1.5">
      <Text className="text-sm text-zinc-500 capitalize">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-sm text-zinc-900 dark:text-zinc-100">
        {value}
      </Text>
    </View>
  );
}
