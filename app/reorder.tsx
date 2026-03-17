import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ScreenLayout, ScreenHeader,
  EngravingLabel, FieldRow, PanelCard,
  PrimaryButton, EmptyState,
  Spacing, FontSize, Radius,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { searchOctopart } from '@/lib/octopart';
import type { OctopartResult, OctopartSeller, OctopartOffer } from '@/lib/octopart';
import { buildAffiliateUrl, getSupplierColor, openSupplierPage, getSearchUrl } from '@/lib/suppliers';
import { supabase } from '@/lib/supabase';
import type { WishlistItem } from '@/lib/types';

export default function ReorderScreen() {
  const { mpn, name } = useLocalSearchParams<{ mpn: string; name: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
      <ScreenLayout style={{ paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Price Compare" backLabel="Back" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl }}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ fontSize: FontSize.md, color: colors.textMuted, marginTop: Spacing.md, textAlign: 'center' }}>
            Searching suppliers for {searchTerm}...
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  if (error || !result) {
    return (
      <ScreenLayout style={{ paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Price Compare" backLabel="Back" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl }}>
          <Ionicons name="storefront-outline" size={48} color={colors.textFaint} />
          <Text style={{ fontSize: FontSize.md, color: colors.textMuted, marginTop: Spacing.md, textAlign: 'center', marginBottom: Spacing.xl }}>
            {error ?? `No supplier data found for "${searchTerm}"`}
          </Text>

          <EngravingLabel label="Search directly" />
          {['Amazon', 'DigiKey', 'Mouser', 'AliExpress'].map((supplier) => (
            <TouchableOpacity
              key={supplier}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: colors.bgCard, borderRadius: Radius.icon,
                paddingHorizontal: Spacing.lg, paddingVertical: 13, marginTop: Spacing.sm, width: '100%',
              }}
              onPress={() => openSupplierPage(getSearchUrl(supplier, searchTerm))}
            >
              <Text style={{ fontSize: FontSize.md, color: colors.textPrimary }}>{supplier}</Text>
              <Ionicons name="open-outline" size={18} color={colors.accent} />
            </TouchableOpacity>
          ))}
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Price Compare" backLabel="Back" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Part header */}
        <View style={{
          flexDirection: 'row', marginHorizontal: Spacing.md, marginTop: Spacing.md,
          backgroundColor: colors.bgCard, borderRadius: Radius.icon, padding: Spacing.md,
          borderWidth: 0.5, borderColor: colors.borderDefault,
        }}>
          {result.imageUrl && (
            <Image
              source={{ uri: result.imageUrl }}
              style={{ width: 64, height: 64, borderRadius: Radius.icon, backgroundColor: colors.bgSurface, marginRight: Spacing.md }}
              contentFit="contain"
            />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FontSize.lg, fontWeight: '600', color: colors.textPrimary }}>
              {result.name}
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: colors.textMuted, marginTop: 2 }}>
              {result.manufacturer}
              {result.mpn ? ` \u2014 ${result.mpn}` : ''}
            </Text>
            {result.category && (
              <View style={{
                marginTop: 4, alignSelf: 'flex-start',
                backgroundColor: colors.accentBg, borderRadius: Radius.badge,
                paddingHorizontal: 8, paddingVertical: 2,
              }}>
                <Text style={{ fontSize: FontSize.xs, color: colors.accent }}>{result.category}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            activeOpacity={0.75}
            style={{ alignSelf: 'flex-start', backgroundColor: colors.bgElevated, borderRadius: Radius.icon, padding: 8 }}
            onPress={handleAddToWishlist}
          >
            <Ionicons name="bookmark-outline" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Supplier cards */}
        <EngravingLabel label={`${result.sellers.length} supplier${result.sellers.length !== 1 ? 's' : ''}`} />

        {result.sellers.map((seller) => (
          <SellerCard
            key={seller.name}
            seller={seller}
            mpn={result.mpn}
          />
        ))}

        {/* Manual search fallbacks */}
        <EngravingLabel label="Search others" />
        {['Amazon', 'AliExpress', 'Adafruit'].map((supplierName) => {
          const alreadyListed = result.sellers.some(
            (s2) => s2.name.toLowerCase().includes(supplierName.toLowerCase())
          );
          if (alreadyListed) return null;
          return (
            <TouchableOpacity
              key={supplierName}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: colors.bgCard, borderRadius: Radius.icon,
                marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
                paddingHorizontal: Spacing.lg, paddingVertical: 13,
                borderWidth: 0.5, borderColor: colors.borderDefault,
              }}
              onPress={() => openSupplierPage(getSearchUrl(supplierName, result.mpn || result.name))}
            >
              <Text style={{ fontSize: FontSize.md, color: colors.textPrimary }}>Search {supplierName}</Text>
              <Ionicons name="open-outline" size={18} color={colors.accent} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </ScreenLayout>
  );
}

function SellerCard({ seller, mpn }: { seller: OctopartSeller; mpn: string }) {
  const { colors } = useTheme();
  const bestOffer = seller.offers[0];
  if (!bestOffer) return null;

  const color = getSupplierColor(seller.name);
  const affiliateUrl = buildAffiliateUrl(seller.name, bestOffer.productUrl, mpn);

  const priceBreaks = bestOffer.prices
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 3);

  return (
    <View style={{
      backgroundColor: colors.bgCard, borderRadius: Radius.icon,
      marginHorizontal: Spacing.md, marginBottom: Spacing.md, padding: Spacing.md,
      borderWidth: 0.5, borderColor: colors.borderDefault,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
          <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.textPrimary }}>{seller.name}</Text>
        </View>
        <View style={{
          backgroundColor: bestOffer.inStock ? colors.statusOkBg : colors.statusOutBg,
          borderRadius: Radius.badge, paddingHorizontal: 6, paddingVertical: 2,
        }}>
          <Text style={{
            fontSize: FontSize.xs, fontWeight: '600',
            color: bestOffer.inStock ? colors.statusOk : colors.statusOut,
          }}>
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
        <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md }}>
          {priceBreaks.map((pb, i) => (
            <View key={i} style={{
              flex: 1, backgroundColor: colors.bgElevated, borderRadius: Radius.icon,
              paddingHorizontal: 8, paddingVertical: 8, alignItems: 'center',
            }}>
              <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>{pb.quantity}+</Text>
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary }}>${pb.price.toFixed(2)}</Text>
              <Text style={{ fontSize: FontSize.xs, color: colors.textFaint }}>{pb.currency}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Buy button */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          borderRadius: Radius.icon, paddingVertical: 10, marginTop: Spacing.md,
          gap: 8, backgroundColor: color,
        }}
        onPress={() => openSupplierPage(affiliateUrl)}
      >
        <Ionicons name="cart-outline" size={18} color={colors.textPrimary} />
        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary }}>Buy from {seller.name}</Text>
      </TouchableOpacity>
    </View>
  );
}
