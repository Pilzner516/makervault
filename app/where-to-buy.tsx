import { View, Text, ScrollView, TouchableOpacity, Linking, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ScreenLayout, ScreenHeader, EngravingLabel, PanelCard,
  SecondaryButton,
  Spacing, FontSize, Radius,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { ELECTRIC_BLUE } from '@/constants/theme';
import { useSupplierStore, Supplier } from '@/lib/zustand/supplierStore';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import { scanSupplierPrices } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';
import { isOctopartAvailable, getPartByMPN } from '@/lib/octopart';

export default function WhereToBuyScreen() {
  const { itemName, partId } = useLocalSearchParams<{ itemName: string; partId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    suppliers, fetchAll,
    favourites, mvPreferred, userEnabled,
    toggleFavourite, getSupplierUrl, userPrefs,
  } = useSupplierStore();

  const [showMore, setShowMore] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [moreScanning, setMoreScanning] = useState(false);
  const [moreScanned, setMoreScanned] = useState(false);
  const [wishlistAdded, setWishlistAdded] = useState(false);

  const { parts, updatePart } = useInventoryStore();

  // Save fetched prices to part specs if partId is provided
  const savePricesToPart = (fetchedPrices: Record<string, string>) => {
    if (!partId) return;
    const part = parts.find((p) => p.id === partId);
    if (!part) return;
    const priceEntries: Record<string, string> = {};
    for (const [supplierName, price] of Object.entries(fetchedPrices)) {
      if (price) {
        const key = `price_${supplierName.replace(/\s+/g, '_')}`;
        priceEntries[key] = price;
      }
    }
    if (Object.keys(priceEntries).length === 0) return;
    priceEntries.price_scan_date = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
    const mergedSpecs = { ...(part.specs ?? {}), ...priceEntries };
    updatePart(partId, { specs: mergedSpecs }).catch(() => {});
  };

  useEffect(() => { fetchAll().catch(() => {}); }, [fetchAll]);

  const favList = favourites();
  const mvList = mvPreferred();
  const enabledList = userEnabled();
  const query = itemName ?? '';
  const favCount = userPrefs.filter((p) => p.is_favourite).length;

  // Collect the primary supplier names (favs + MV preferred + user enabled)
  const primarySuppliers = [...favList, ...mvList.filter((s) => !favList.find((f) => f.id === s.id)), ...enabledList];
  const remainingSuppliers = suppliers.filter((s) => !primarySuppliers.find((p) => p.id === s.id));

  // Auto-scan prices for primary suppliers on mount
  useEffect(() => {
    if (scanned || scanning || !query || primarySuppliers.length === 0) return;
    setScanning(true);
    const names = primarySuppliers.map((s) => s.name);
    scanSupplierPrices(query, names)
      .then((result) => {
        setPrices((prev) => ({ ...prev, ...result }));
        savePricesToPart(result);

        // Best-effort Octopart overlay: if item might have an MPN, try to get real prices
        if (isOctopartAvailable()) {
          // Extract potential MPN from the query — could be "Part Name, MPN" format
          const querySegments = query.split(',').map((seg) => seg.trim());
          const potentialMpn = querySegments.length > 1 ? querySegments[1] : querySegments[0];
          if (potentialMpn) {
            getPartByMPN(potentialMpn).then((octoResult) => {
              if (!octoResult || octoResult.sellers.length === 0) return;
              const octoprices: Record<string, string> = {};
              for (const seller of octoResult.sellers) {
                const bestOffer = seller.offers.find((o) => o.inStock && o.prices.length > 0);
                if (bestOffer && bestOffer.prices.length > 0) {
                  const p = bestOffer.prices[0];
                  const priceStr = `${p.currency === 'USD' ? '$' : p.currency}${p.price.toFixed(2)}`;
                  // Match against known supplier names (case-insensitive partial match)
                  const sellerLower = seller.name.toLowerCase();
                  const matchedName = names.find((n) => sellerLower.includes(n.toLowerCase()) || n.toLowerCase().includes(sellerLower));
                  if (matchedName) {
                    octoprices[matchedName] = priceStr;
                  }
                }
              }
              if (Object.keys(octoprices).length > 0) {
                setPrices((prev) => ({ ...prev, ...octoprices }));
                savePricesToPart(octoprices);
              }
            }).catch(() => {}); // Silently fail
          }
        }
      })
      .finally(() => { setScanning(false); setScanned(true); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, scanned, primarySuppliers.length]);

  const handleScanMore = () => {
    setShowMore(true);
    if (moreScanned || moreScanning || remainingSuppliers.length === 0) return;
    setMoreScanning(true);
    const names = remainingSuppliers.map((s) => s.name);
    scanSupplierPrices(query, names)
      .then((result) => {
        setPrices((prev) => ({ ...prev, ...result }));
        savePricesToPart(result);
      })
      .finally(() => { setMoreScanning(false); setMoreScanned(true); });
  };

  const openSupplier = (supplier: Supplier) => {
    Linking.openURL(getSupplierUrl(supplier, query)).catch(() => {});
  };

  const handleToggleFav = (supplierId: string) => {
    const fav = userPrefs.find((p) => p.supplier_id === supplierId)?.is_favourite;
    if (!fav && favCount >= 4) {
      Alert.alert('Maximum 4 favourites', 'Remove one before adding another.');
      return;
    }
    toggleFavourite(supplierId);
  };

  const isFav = (supplierId: string) =>
    userPrefs.find((p) => p.supplier_id === supplierId)?.is_favourite ?? false;

  const getPrice = (name: string): string | null => prices[name] ?? null;

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="Price Check"
        subtitle={query}
        backLabel="Back"
        onBack={() => router.back()}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Scanning banner */}
        {scanning && (
          <View style={[st.scanBanner, { backgroundColor: ELECTRIC_BLUE + '10', borderBottomColor: ELECTRIC_BLUE + '30' }]}>
            <ActivityIndicator size="small" color={ELECTRIC_BLUE} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: ELECTRIC_BLUE }}>
              Scanning supplier prices...
            </Text>
          </View>
        )}

        {/* Favourites */}
        {favList.length > 0 && (
          <>
            <EngravingLabel label="Your favourites" />
            <PanelCard>
              {favList.map((sup, i) => (
                <SupplierRow
                  key={sup.id}
                  supplier={sup}
                  isFav={true}
                  price={getPrice(sup.name)}
                  loading={scanning}
                  onToggleFav={() => handleToggleFav(sup.id)}
                  onOpen={() => openSupplier(sup)}
                  colors={colors}
                  isLast={i === favList.length - 1}
                />
              ))}
            </PanelCard>
          </>
        )}

        {/* MV Preferred */}
        <EngravingLabel label="MV Preferred" />
        <PanelCard>
          {mvList.map((sup, i) => (
            <SupplierRow
              key={sup.id}
              supplier={sup}
              isFav={isFav(sup.id)}
              price={getPrice(sup.name)}
              loading={scanning}
              onToggleFav={() => handleToggleFav(sup.id)}
              onOpen={() => openSupplier(sup)}
              colors={colors}
              isLast={i === mvList.length - 1}
            />
          ))}
        </PanelCard>

        {/* User enabled */}
        {enabledList.length > 0 && (
          <>
            <EngravingLabel label="Your suppliers" />
            <PanelCard>
              {enabledList.map((sup, i) => (
                <SupplierRow
                  key={sup.id}
                  supplier={sup}
                  isFav={isFav(sup.id)}
                  price={getPrice(sup.name)}
                  loading={scanning}
                  onToggleFav={() => handleToggleFav(sup.id)}
                  onOpen={() => openSupplier(sup)}
                  colors={colors}
                  isLast={i === enabledList.length - 1}
                />
              ))}
            </PanelCard>
          </>
        )}

        {/* Search more prices */}
        {!showMore ? (
          <View style={{ marginTop: 8 }}>
            <SecondaryButton
              label={`Search ${remainingSuppliers.length} More Suppliers`}
              icon="search-outline"
              onPress={handleScanMore}
            />
          </View>
        ) : (
          <>
            {moreScanning && (
              <View style={[st.scanBanner, { backgroundColor: ELECTRIC_BLUE + '10', borderBottomColor: ELECTRIC_BLUE + '30', marginTop: 4 }]}>
                <ActivityIndicator size="small" color={ELECTRIC_BLUE} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: ELECTRIC_BLUE }}>
                  Scanning more suppliers...
                </Text>
              </View>
            )}
            <EngravingLabel label="All suppliers" />
            <PanelCard>
              {remainingSuppliers.map((sup, i) => (
                <SupplierRow
                  key={sup.id}
                  supplier={sup}
                  isFav={isFav(sup.id)}
                  price={getPrice(sup.name)}
                  loading={moreScanning}
                  onToggleFav={() => handleToggleFav(sup.id)}
                  onOpen={() => openSupplier(sup)}
                  colors={colors}
                  isLast={i === remainingSuppliers.length - 1}
                />
              ))}
            </PanelCard>
          </>
        )}

        {/* Add to Wishlist */}
        <View style={{ marginTop: 8 }}>
          <SecondaryButton
            label={wishlistAdded ? 'Added to Wishlist' : 'Add to Wishlist'}
            icon={wishlistAdded ? 'checkmark-circle-outline' : 'bookmark-outline'}
            onPress={async () => {
              if (wishlistAdded) return;
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { Alert.alert('Sign in required', 'Please sign in to use the wishlist.'); return; }
                await supabase.from('wishlist').insert({
                  user_id: user.id,
                  name: query,
                });
                setWishlistAdded(true);
              } catch {
                Alert.alert('Error', 'Could not add to wishlist. The feature may not be available yet.');
              }
            }}
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

function SupplierRow({
  supplier, isFav, price, loading, onToggleFav, onOpen, colors, isLast,
}: {
  supplier: Supplier;
  isFav: boolean;
  price: string | null;
  loading: boolean;
  onToggleFav: () => void;
  onOpen: () => void;
  colors: { textSecondary: string; textMuted: string; textDisabled: string; accent: string; accentBg: string; accentBorder: string; borderSubtle: string; statusOk: string };
  isLast?: boolean;
}) {
  const hasPrice = price !== null && price !== '';
  const notCarried = price === '';

  return (
    <View style={[st.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }]}>
      {/* Logo */}
      <View style={[st.logoMd, { backgroundColor: supplier.logo_bg }]}>
        <Text style={[st.logoText, { color: supplier.logo_text }]}>{supplier.logo_label}</Text>
      </View>

      {/* Info + Price */}
      <TouchableOpacity style={st.rowInfo} activeOpacity={0.75} onPress={onOpen}>
        <Text style={[st.rowName, { color: colors.textSecondary }]}>{supplier.name}</Text>
        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ActivityIndicator size={10} color={ELECTRIC_BLUE} />
            <Text style={{ fontSize: 13, color: colors.textMuted }}>scanning...</Text>
          </View>
        ) : hasPrice ? (
          <Text style={[st.rowPrice, { color: ELECTRIC_BLUE }]}>{price}</Text>
        ) : notCarried ? (
          <Text style={[st.rowPrice, { color: colors.textMuted }]}>Verify</Text>
        ) : (
          <Text style={[st.rowPrice, { color: colors.textMuted }]}>—</Text>
        )}
      </TouchableOpacity>

      {/* Star */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggleFav}
        style={st.starBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={isFav ? 'star' : 'star-outline'}
          size={20}
          color={isFav ? '#fcd34d' : colors.textDisabled}
        />
      </TouchableOpacity>

      {/* MV badge */}
      {supplier.is_mv_preferred && (
        <View style={[st.mvBadge, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
          <Text style={[st.mvBadgeText, { color: colors.accent }]}>MV</Text>
        </View>
      )}

      {/* Open */}
      <TouchableOpacity activeOpacity={0.7} onPress={onOpen} style={st.openBtn}>
        <Ionicons name="open-outline" size={18} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  scanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  logoMd: {
    width: 56, height: 30, borderRadius: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 52,
    gap: 8,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '700',
  },
  rowPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  starBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mvBadge: {
    borderRadius: 2,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  mvBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  openBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
