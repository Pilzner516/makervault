import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { searchOctopart } from '@/lib/octopart';
import type { OctopartResult, OctopartSeller, OctopartOffer } from '@/lib/octopart';
import { buildAffiliateUrl, getSupplierColor, openSupplierPage, getSearchUrl } from '@/lib/suppliers';
import { supabase } from '@/lib/supabase';
import type { WishlistItem } from '@/lib/types';

export default function ReorderScreen() {
  const { mpn, name } = useLocalSearchParams<{ mpn: string; name: string }>();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<OctopartResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchTerm = mpn || name || '';

  useEffect(() => {
    if (!searchTerm) return;
    (async () => {
      try {
        const results = await searchOctopart(searchTerm);
        setResult(results[0] ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch pricing');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [searchTerm]);

  const handleAddToWishlist = async () => {
    if (!result) return;
    const item: Omit<WishlistItem, 'id' | 'user_id' | 'created_at'> = {
      name: result.name,
      mpn: result.mpn || null,
      category: result.category || null,
      notes: null,
      preferred_supplier: result.sellers[0]?.name ?? null,
    };
    await supabase.from('wishlist').insert(item);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Stack.Screen options={{ title: 'Price Compare' }} />
        <ActivityIndicator size="large" color="#0a7ea4" />
        <Text className="mt-3 text-base text-zinc-500">
          Searching suppliers for {searchTerm}...
        </Text>
      </View>
    );
  }

  if (error || !result) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 px-8 dark:bg-zinc-950">
        <Stack.Screen options={{ title: 'Price Compare' }} />
        <MaterialIcons name="store" size={48} color="#a1a1aa" />
        <Text className="mt-3 text-center text-base text-zinc-500">
          {error ?? `No supplier data found for "${searchTerm}"`}
        </Text>
        {/* Fallback: direct search links */}
        <Text className="mt-6 mb-3 text-sm font-medium text-zinc-400">Search directly:</Text>
        {['Amazon', 'DigiKey', 'Mouser', 'AliExpress'].map((supplier) => (
          <Pressable
            key={supplier}
            className="mt-2 w-full rounded-lg bg-white px-4 py-3 dark:bg-zinc-800"
            onPress={() => openSupplierPage(getSearchUrl(supplier, searchTerm))}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-base text-zinc-900 dark:text-zinc-100">{supplier}</Text>
              <MaterialIcons name="open-in-new" size={18} color="#0a7ea4" />
            </View>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <Stack.Screen options={{ title: 'Price Compare' }} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Part header */}
        <View className="mx-4 mt-4 flex-row rounded-xl bg-white p-4 dark:bg-zinc-800">
          {result.imageUrl && (
            <Image
              source={{ uri: result.imageUrl }}
              className="mr-3 h-16 w-16 rounded-lg bg-zinc-100"
              contentFit="contain"
            />
          )}
          <View className="flex-1">
            <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {result.name}
            </Text>
            <Text className="text-sm text-zinc-500">
              {result.manufacturer}
              {result.mpn ? ` — ${result.mpn}` : ''}
            </Text>
            {result.category && (
              <View className="mt-1 self-start rounded-full bg-primary/10 px-2.5 py-0.5">
                <Text className="text-xs text-primary">{result.category}</Text>
              </View>
            )}
          </View>
          <Pressable
            className="self-start rounded-lg bg-zinc-100 p-2 dark:bg-zinc-700"
            onPress={handleAddToWishlist}
          >
            <MaterialIcons name="bookmark-add" size={20} color="#0a7ea4" />
          </Pressable>
        </View>

        {/* Supplier cards */}
        <Text className="mx-4 mt-5 mb-2 text-sm font-medium uppercase text-zinc-400">
          {result.sellers.length} Supplier{result.sellers.length !== 1 ? 's' : ''}
        </Text>

        {result.sellers.map((seller) => (
          <SellerCard
            key={seller.name}
            seller={seller}
            mpn={result.mpn}
          />
        ))}

        {/* Manual search fallbacks */}
        <Text className="mx-4 mt-5 mb-2 text-sm font-medium uppercase text-zinc-400">
          Search Others
        </Text>
        {['Amazon', 'AliExpress', 'Adafruit'].map((name) => {
          const alreadyListed = result.sellers.some(
            (s) => s.name.toLowerCase().includes(name.toLowerCase())
          );
          if (alreadyListed) return null;
          return (
            <Pressable
              key={name}
              className="mx-4 mb-2 flex-row items-center justify-between rounded-xl bg-white px-4 py-3 dark:bg-zinc-800"
              onPress={() => openSupplierPage(getSearchUrl(name, result.mpn || result.name))}
            >
              <Text className="text-base text-zinc-900 dark:text-zinc-100">
                Search {name}
              </Text>
              <MaterialIcons name="open-in-new" size={18} color="#0a7ea4" />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SellerCard({ seller, mpn }: { seller: OctopartSeller; mpn: string }) {
  const bestOffer = seller.offers[0];
  if (!bestOffer) return null;

  const color = getSupplierColor(seller.name);
  const affiliateUrl = buildAffiliateUrl(seller.name, bestOffer.productUrl, mpn);

  // Group prices by quantity break
  const priceBreaks = bestOffer.prices
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 3);

  return (
    <View className="mx-4 mb-3 rounded-xl bg-white p-4 dark:bg-zinc-800">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View
            className="mr-2 h-3 w-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {seller.name}
          </Text>
        </View>
        <View
          className={`rounded-full px-2 py-0.5 ${
            bestOffer.inStock ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              bestOffer.inStock ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {bestOffer.inStock
              ? bestOffer.stockQuantity != null
                ? `${bestOffer.stockQuantity} in stock`
                : 'In Stock'
              : 'Out of Stock'}
          </Text>
        </View>
      </View>

      {/* Price breaks */}
      {priceBreaks.length > 0 && (
        <View className="mt-3 flex-row gap-3">
          {priceBreaks.map((pb, i) => (
            <View key={i} className="flex-1 rounded-lg bg-zinc-50 px-2 py-2 dark:bg-zinc-700">
              <Text className="text-center text-xs text-zinc-500">
                {pb.quantity}+
              </Text>
              <Text className="text-center text-base font-bold text-zinc-900 dark:text-zinc-100">
                ${pb.price.toFixed(2)}
              </Text>
              <Text className="text-center text-xs text-zinc-400">
                {pb.currency}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Buy button */}
      <Pressable
        className="mt-3 flex-row items-center justify-center rounded-lg py-2.5"
        style={{ backgroundColor: color }}
        onPress={() => openSupplierPage(affiliateUrl)}
      >
        <MaterialIcons name="shopping-cart" size={18} color="#fff" />
        <Text className="ml-2 text-sm font-semibold text-white">
          Buy from {seller.name}
        </Text>
      </Pressable>
    </View>
  );
}
