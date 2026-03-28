import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, Linking, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import {
  ScreenLayout, ScreenHeader,
  MetricRow, MetricTile,
  EngravingLabel, FieldRow, PanelCard,
  PrimaryButton, SecondaryButton,
  EmptyState,
  Spacing, FontSize, Radius,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { ELECTRIC_BLUE } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { getCategoryColor } from '@/lib/categoryColors';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import { useSupplierStore } from '@/lib/zustand/supplierStore';
import { sendLowStockAlert } from '@/lib/notifications';
import { fetchProductImageUrl } from '@/lib/gemini';
import { getPartByMPN, isOctopartAvailable } from '@/lib/octopart';
import type { OctopartResult } from '@/lib/octopart';
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
  const { colors } = useTheme();
  const { parts, updatePart, deletePart } = useInventoryStore();
  const { suppliers: allSuppliers, fetchAll: fetchSuppliers, mvPreferred, favourites, getSupplierUrl } = useSupplierStore();

  const part = parts.find((p) => p.id === id);
  const [locations, setLocations] = useState<LocationWithName[]>([]);
  const [supplierLinks, setSupplierLinks] = useState<SupplierLinkWithName[]>([]);
  const [inWishlist, setInWishlist] = useState(false);

  // ─── PRODUCT IMAGE ───
  const [fetchingImage, setFetchingImage] = useState(false);
  const rawProductUrl = part?.specs?.product_image_url ?? null;
  // Distinguish direct image URLs from search URLs
  const isDirectImage = rawProductUrl ? !rawProductUrl.includes('google.com/search') : false;
  const productImageUrl = isDirectImage ? rawProductUrl : null;
  const productSearchUrl = !isDirectImage ? rawProductUrl : null;

  const handleFetchProductImage = useCallback(async () => {
    if (!part || fetchingImage) return;
    setFetchingImage(true);
    try {
      const url = await fetchProductImageUrl(part.name, part.mpn);
      if (url) {
        const specs = { ...(part.specs ?? {}), product_image_url: url };
        await updatePart(part.id, { specs });
      } else {
        Alert.alert('No image found', 'Could not find a product image for this part.');
      }
    } catch { /* silent */ }
    finally { setFetchingImage(false); }
  }, [part, fetchingImage, updatePart]);

  // ─── OCTOPART LIVE DATA ───
  const [octopartLoading, setOctopartLoading] = useState(false);
  const [octopartData, setOctopartData] = useState<OctopartResult | null>(null);
  const [octopartFetched, setOctopartFetched] = useState(false);

  const handleFetchOctopart = useCallback(async () => {
    if (!part?.mpn || octopartLoading) return;
    setOctopartLoading(true);
    try {
      const result = await getPartByMPN(part.mpn);
      setOctopartData(result);
      setOctopartFetched(true);
      if (result) {
        // Merge Octopart specs and datasheet into part
        const specUpdates: Record<string, string> = { ...(part.specs ?? {}) };
        for (const [key, val] of Object.entries(result.specs)) {
          if (val) specUpdates[key] = val;
        }
        const datasheetUrl = result.specs['Datasheet URL'] ?? result.specs['datasheet'] ?? null;
        const updates: Partial<Part> = { specs: specUpdates };
        if (datasheetUrl && !part.datasheet_url) {
          updates.datasheet_url = datasheetUrl;
        }
        await updatePart(part.id, updates);
      }
    } catch {
      // Silently fail — Octopart is best-effort
    } finally {
      setOctopartLoading(false);
    }
  }, [part, octopartLoading, updatePart]);

  // ─── EDIT MODE ───
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editManufacturer, setEditManufacturer] = useState('');
  const [editMpn, setEditMpn] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editThreshold, setEditThreshold] = useState('');
  const [editQuantity, setEditQuantity] = useState('');

  const startEditing = () => {
    if (!part) return;
    setEditName(part.name);
    setEditManufacturer(part.manufacturer ?? '');
    setEditMpn(part.mpn ?? '');
    setEditCategory(part.category ?? '');
    setEditSubcategory(part.subcategory ?? '');
    setEditDescription(part.description ?? '');
    setEditNotes(part.notes ?? '');
    setEditThreshold(String(part.low_stock_threshold));
    setEditQuantity(String(part.quantity));
    setEditing(true);
  };

  const cancelEditing = () => setEditing(false);

  const saveEdits = async () => {
    if (!part || !editName.trim()) return;
    try {
      await updatePart(part.id, {
        name: editName.trim(),
        manufacturer: editManufacturer.trim() || null,
        mpn: editMpn.trim() || null,
        category: editCategory.trim() || null,
        subcategory: editSubcategory.trim() || null,
        description: editDescription.trim() || null,
        notes: editNotes.trim() || null,
        low_stock_threshold: parseInt(editThreshold, 10) || 0,
        quantity: parseInt(editQuantity, 10) || 0,
      });
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to save changes.');
    }
  };

  // ─── SEARCH QUERY ───
  const junk = ['n/a', 'generic', 'unknown', 'not specified', 'unbranded', 'none', ''];
  const clean = (s: string | null | undefined) => s && !junk.includes(s.toLowerCase().trim()) ? s.trim() : null;
  const mpnClean = clean(part?.mpn);
  const mfgClean = clean(part?.manufacturer);
  const nameClean = clean(part?.name) ?? '';
  const shortName = nameClean.split(/[\s,]+/).slice(0, 6).join(' ');

  // Search query strategy:
  // Always lead with the DESCRIPTIVE NAME (what retailers index)
  // Then append MPN as secondary detail after a comma
  // Amazon/general retailers: "Raspberry Pi Zero 2 W" finds results
  // Specialty retailers: "LM7805CT" also finds results via the MPN
  const searchQuery = [shortName, mpnClean ? `, ${mpnClean}` : '', mfgClean ? ` ${mfgClean}` : '']
    .filter(Boolean).join('').trim();

  // Google search helpers (always available)
  const extraLinks = [
    { name: 'Images', logo_bg: '#4285F4', logo_text: '#FFFFFF', logo_label: 'IMG', url: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}` },
    { name: 'Datasheet', logo_bg: '#34A853', logo_text: '#FFFFFF', logo_label: 'PDF', url: `https://www.google.com/search?q=${encodeURIComponent(searchQuery + ' datasheet filetype:pdf')}` },
  ];

  useEffect(() => { fetchSuppliers().catch(() => {}); }, [fetchSuppliers]);

  // Build quick-search supplier list: favourites first, then MV preferred
  const quickSuppliers = [...favourites(), ...mvPreferred().filter((s) => !favourites().find((f) => f.id === s.id))].slice(0, 6);

  useEffect(() => {
    if (!id) return;
    supabase.from('part_locations').select('*, storage_locations(*)').eq('part_id', id)
      .then(({ data }) => {
        if (data) setLocations(data.map((pl: Record<string, unknown>) => ({
          ...(pl as unknown as PartLocation),
          location: pl.storage_locations as unknown as StorageLocation,
        })));
      });
    supabase.from('part_supplier_links').select('*, suppliers(*)').eq('part_id', id)
      .then(({ data }) => {
        if (data) setSupplierLinks(data.map((sl: Record<string, unknown>) => ({
          ...(sl as unknown as PartSupplierLink),
          supplier: sl.suppliers as unknown as Supplier,
        })));
      });
    // Check if part is in wishlist
    const checkWishlist = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const currentPart = parts.find((p) => p.id === id);
        if (!currentPart) return;
        const { data } = await supabase
          .from('wishlist')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', currentPart.name)
          .limit(1);
        if (data && data.length > 0) setInWishlist(true);
      } catch {
        // Wishlist table may not exist yet
      }
    };
    checkWishlist();
  }, [id]);

  const handleQuantityChange = useCallback(
    async (newQuantity: number) => {
      if (!part) return;
      await updatePart(part.id, { quantity: newQuantity });
      if (newQuantity <= part.low_stock_threshold && newQuantity < part.quantity) {
        sendLowStockAlert({ ...part, quantity: newQuantity }).catch(() => {});
      }
    },
    [part, updatePart]
  );

  const handleToggleWishlist = async () => {
    if (!part) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Sign in required', 'Please sign in to use the wishlist.'); return; }
      if (inWishlist) {
        await supabase.from('wishlist').delete().eq('user_id', user.id).eq('name', part.name);
        setInWishlist(false);
      } else {
        await supabase.from('wishlist').insert({
          user_id: user.id,
          name: part.name,
          mpn: part.mpn ?? null,
          category: part.category ?? null,
        });
        setInWishlist(true);
      }
    } catch {
      Alert.alert('Error', 'Could not update wishlist. The feature may not be available yet.');
    }
  };

  const handleDelete = () => {
    if (!part) return;
    const partId = part.id;
    Alert.alert('Delete Part', `Remove "${part.name}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { router.back(); setTimeout(() => { deletePart(partId).catch(() => {}); }, 300); } },
    ]);
  };

  if (!part) {
    return (
      <ScreenLayout style={{ paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState icon="alert-circle-outline" title="Part not found" subtitle="This part may have been deleted" actionLabel="Go Back" onAction={() => router.back()} />
      </ScreenLayout>
    );
  }

  const isLowStock = part.quantity <= part.low_stock_threshold;

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={part.name}
        subtitle={[part.category, part.manufacturer].filter(Boolean).join(' · ') || undefined}
        backLabel="Inventory"
        onBack={() => router.back()}
        rightElement={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => router.push({ pathname: '/qr-labels' as any, params: { type: 'part', id: part.id, title: part.name, subtitle: part.category ?? undefined } })} activeOpacity={0.7}>
              <Ionicons name="qr-code-outline" size={22} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleToggleWishlist} activeOpacity={0.7}>
              <Ionicons name={inWishlist ? 'bookmark' : 'bookmark-outline'} size={22} color={inWishlist ? ELECTRIC_BLUE : colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={editing ? saveEdits : startEditing} activeOpacity={0.7}>
              <Ionicons name={editing ? 'checkmark-circle' : 'pencil'} size={22} color={editing ? colors.statusOk : colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={22} color={colors.statusOut} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Photos — scan image + product image */}
        <View style={s.photoRow}>
          {part.image_url && (
            <View style={s.photoWrap}>
              <Image source={{ uri: part.image_url }} style={s.photo} contentFit="cover" />
              <Text style={[s.photoLabel, { color: colors.textFaint }]}>YOUR SCAN</Text>
            </View>
          )}
          {productImageUrl ? (
            <TouchableOpacity style={s.photoWrap} activeOpacity={0.75} onPress={() => {
              Alert.alert('Product Image', 'What would you like to do?', [
                { text: 'Re-scan Image', onPress: () => {
                  // Clear old image and fetch fresh
                  const specs = { ...(part.specs ?? {}) };
                  delete specs.product_image_url;
                  updatePart(part.id, { specs }).then(() => handleFetchProductImage()).catch(() => {});
                }},
                { text: 'Browse Images', onPress: () => {
                  const q = encodeURIComponent((part.mpn ? `${part.mpn} ` : '') + part.name);
                  WebBrowser.openBrowserAsync(`https://www.google.com/search?tbm=isch&q=${q}+product`);
                }},
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}>
              {fetchingImage ? (
                <ActivityIndicator size="large" color={ELECTRIC_BLUE} style={s.photo} />
              ) : (
                <Image source={{ uri: productImageUrl }} style={s.photo} contentFit="contain" />
              )}
              <Text style={[s.photoLabel, { color: colors.textFaint }]}>PRODUCT · TAP TO RESCAN</Text>
            </TouchableOpacity>
          ) : productSearchUrl ? (
            <TouchableOpacity
              style={[s.photoWrap, s.fetchImageBtn, { borderColor: colors.borderDefault }]}
              activeOpacity={0.75}
              onPress={() => WebBrowser.openBrowserAsync(productSearchUrl)}
            >
              <Ionicons name="images-outline" size={28} color={ELECTRIC_BLUE} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: ELECTRIC_BLUE, textAlign: 'center', marginTop: 4 }}>
                View Product{'\n'}Images
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.photoWrap, s.fetchImageBtn, { borderColor: colors.borderDefault }]}
              activeOpacity={0.75}
              onPress={handleFetchProductImage}
              disabled={fetchingImage}
            >
              {fetchingImage ? (
                <ActivityIndicator size="small" color={ELECTRIC_BLUE} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={28} color={ELECTRIC_BLUE} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: ELECTRIC_BLUE, textAlign: 'center', marginTop: 4 }}>
                    Find Product{'\n'}Image
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Edit mode save/cancel bar */}
        {editing && (
          <View style={[s.editBar, { backgroundColor: colors.accentBg, borderBottomColor: colors.accentBorder }]}>
            <Ionicons name="pencil" size={14} color={colors.accent} />
            <Text style={[s.editBarText, { color: colors.accent }]}>EDITING MODE</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={saveEdits} activeOpacity={0.7} style={[s.editBarBtn, { backgroundColor: colors.accent }]}>
              <Text style={[s.editBarBtnText, { color: colors.bgBase }]}>SAVE</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={cancelEditing} activeOpacity={0.7} style={[s.editBarBtn, { backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderDefault }]}>
              <Text style={[s.editBarBtnText, { color: colors.textMuted }]}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Supplier search + Price Check */}
        {!editing && (
          <>
            <EngravingLabel label="Look up part" action="All suppliers" onAction={() => router.push({ pathname: '/where-to-buy', params: { itemName: searchQuery || part.name, partId: part.id } })} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingBottom: 8 }}>
              {quickSuppliers.map((sup) => (
                <TouchableOpacity key={sup.id} activeOpacity={0.75}
                  style={[s.supplierPill, { backgroundColor: sup.logo_bg }]}
                  onPress={() => Linking.openURL(getSupplierUrl(sup, searchQuery || part.name)).catch(() => {})}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: sup.logo_text, letterSpacing: -0.3 }}>{sup.logo_label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: sup.logo_text, opacity: 0.8 }}>{sup.name}</Text>
                </TouchableOpacity>
              ))}
              {extraLinks.map((link) => (
                <TouchableOpacity key={link.name} activeOpacity={0.75}
                  style={[s.supplierPill, { backgroundColor: link.logo_bg }]}
                  onPress={() => WebBrowser.openBrowserAsync(link.url)}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: link.logo_text, letterSpacing: -0.3 }}>{link.logo_label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: link.logo_text, opacity: 0.8 }}>{link.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {/* Price Check button — right below supplier icons */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={[s.priceCheckBtn, { backgroundColor: ELECTRIC_BLUE + '15', borderColor: ELECTRIC_BLUE + '40' }]}
              onPress={() => router.push({ pathname: '/where-to-buy', params: { itemName: searchQuery || part.name, partId: part.id } })}
            >
              <Ionicons name="pricetag-outline" size={18} color={ELECTRIC_BLUE} />
              <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: ELECTRIC_BLUE }}>
                Price Check
              </Text>
              {part.specs?.estimated_price ? (
                <Text style={{ fontSize: 14, fontWeight: '600', color: ELECTRIC_BLUE, opacity: 0.7, marginLeft: 'auto' }}>
                  {part.specs.estimated_price}
                </Text>
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '600', color: ELECTRIC_BLUE, opacity: 0.5, marginLeft: 'auto' }}>
                  Verify
                </Text>
              )}
            </TouchableOpacity>
            {/* Fetch Live Data (Octopart) — subtle text button */}
            {mpnClean && (
              <TouchableOpacity
                activeOpacity={0.75}
                disabled={!isOctopartAvailable() || octopartLoading}
                onPress={handleFetchOctopart}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12 }}
              >
                {octopartLoading ? (
                  <>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>Fetching live data...</Text>
                  </>
                ) : !isOctopartAvailable() ? (
                  <Text style={{ fontSize: 13, color: colors.textDisabled }}>Configure Octopart API key in .env</Text>
                ) : octopartFetched && octopartData ? (
                  <Text style={{ fontSize: 13, color: colors.statusOk }}>Live data loaded</Text>
                ) : octopartFetched && !octopartData ? (
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>No Octopart data found</Text>
                ) : (
                  <>
                    <Ionicons name="cloud-download-outline" size={14} color={colors.textMuted} />
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>Fetch Live Data (Octopart)</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {/* Octopart seller prices */}
            {octopartData && octopartData.sellers.length > 0 && (
              <View style={{ marginHorizontal: 12, marginTop: 4, marginBottom: 4 }}>
                {octopartData.sellers.slice(0, 5).map((seller) => {
                  const bestOffer = seller.offers.find((o) => o.inStock && o.prices.length > 0);
                  const bestPrice = bestOffer?.prices[0];
                  return (
                    <TouchableOpacity
                      key={seller.name}
                      activeOpacity={0.75}
                      style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingVertical: 6, paddingHorizontal: 8,
                        borderBottomWidth: 0.5, borderBottomColor: colors.borderSubtle,
                      }}
                      onPress={bestOffer?.productUrl ? () => Linking.openURL(bestOffer.productUrl) : undefined}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>{seller.name}</Text>
                      {bestPrice ? (
                        <Text style={{ fontSize: 13, fontWeight: '700', color: ELECTRIC_BLUE }}>
                          {bestPrice.currency === 'USD' ? '$' : bestPrice.currency}{bestPrice.price.toFixed(2)}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 13, color: colors.textMuted }}>
                          {seller.offers.some((o) => o.inStock) ? 'In stock' : 'Out of stock'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* Metrics */}
        {!editing && (
          <MetricRow>
            <MetricTile value={String(part.quantity)} label="QTY" />
            <MetricTile value={String(part.low_stock_threshold)} label="THRESHOLD" />
            <MetricTile value={part.category?.slice(0, 6).toUpperCase() ?? '—'} label="TYPE" />
          </MetricRow>
        )}

        {/* Quantity adjuster (view mode) */}
        {!editing && (
          <View style={[s.adjusterWrap, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
            <QuantityAdjuster quantity={part.quantity} onChange={handleQuantityChange} />
            {isLowStock && (
              <View style={[s.lowStockBanner, { backgroundColor: colors.accentBg }]}>
                <Ionicons name="warning" size={14} color={colors.accent} />
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.accent }}>Below threshold ({part.low_stock_threshold})</Text>
              </View>
            )}
          </View>
        )}

        {/* Find Item button */}
        {!editing && (
          <TouchableOpacity
            activeOpacity={0.75}
            style={[s.findItemBtn, { backgroundColor: ELECTRIC_BLUE + '15', borderColor: ELECTRIC_BLUE + '40' }]}
            onPress={() => router.push({ pathname: '/find-item' as never, params: { partId: part.id, partName: part.name } })}
          >
            <Ionicons name="scan-outline" size={20} color={ELECTRIC_BLUE} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: ELECTRIC_BLUE }}>
              Find Item
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: ELECTRIC_BLUE, opacity: 0.6, marginLeft: 'auto' }}>
              Scan drawer QR
            </Text>
          </TouchableOpacity>
        )}

        {/* ─── DETAILS: View or Edit ─── */}
        <EngravingLabel label={editing ? 'Edit details' : 'Details'} />
        <PanelCard>
          {editing ? (
            <>
              <EditField label="Name" value={editName} onChangeText={setEditName} colors={colors} />
              <EditField label="Manufacturer" value={editManufacturer} onChangeText={setEditManufacturer} colors={colors} />
              <EditField label="MPN" value={editMpn} onChangeText={setEditMpn} colors={colors} />
              <EditField label="Category" value={editCategory} onChangeText={setEditCategory} colors={colors} />
              <EditField label="Subcategory" value={editSubcategory} onChangeText={setEditSubcategory} colors={colors} />
              <EditField label="Description" value={editDescription} onChangeText={setEditDescription} colors={colors} multiline />
              <EditField label="Notes" value={editNotes} onChangeText={setEditNotes} colors={colors} multiline />
              <EditField label="Quantity" value={editQuantity} onChangeText={setEditQuantity} colors={colors} numeric />
              <EditField label="Low Stock Threshold" value={editThreshold} onChangeText={setEditThreshold} colors={colors} numeric isLast />
            </>
          ) : (
            <>
              <FieldRow label="Name" value={part.name} />
              {part.manufacturer && <FieldRow label="Manufacturer" value={part.manufacturer} />}
              {part.mpn && <FieldRow label="MPN" value={part.mpn} valueColor={colors.accent} />}
              {part.category && (
                <View style={[s.fieldRowWrap, { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }]}>
                  <Text style={[s.fieldLabel, { color: colors.textFaint }]}>CATEGORY</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {(() => {
                      const catColor = getCategoryColor(part.category);
                      return (
                        <View style={{
                          backgroundColor: catColor + '18', borderRadius: 3,
                          borderWidth: 0.5, borderColor: catColor + '40',
                          paddingHorizontal: 7, paddingVertical: 2,
                        }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: catColor }}>{part.category}</Text>
                        </View>
                      );
                    })()}
                  </View>
                </View>
              )}
              {part.subcategory && <FieldRow label="Subcategory" value={part.subcategory} />}
              {part.description && <FieldRow label="Description" value={part.description} />}
              {part.notes && <FieldRow label="Notes" value={part.notes} />}
              <FieldRow label="Quantity" value={String(part.quantity)} />
              <FieldRow label="Threshold" value={String(part.low_stock_threshold)} />
              {/* Price estimate */}
              {part.specs?.estimated_price ? (
                <FieldRow label="Est. Price" value={part.specs.estimated_price} valueColor={colors.statusOk} />
              ) : (
                <FieldRow label="Est. Price" value="Verify" valueColor={colors.textMuted} />
              )}
              {/* Saved supplier prices from price checks */}
              {part.specs && Object.entries(part.specs)
                .filter(([key]) => key.startsWith('price_') && key !== 'price_scan_date' && key !== 'estimated_price')
                .map(([key, val]) => (
                  <FieldRow
                    key={key}
                    label={key.replace(/^price_/, '').replace(/_/g, ' ')}
                    value={String(val)}
                    valueColor={ELECTRIC_BLUE}
                  />
                ))
              }
              {/* Last price check date */}
              {part.specs?.price_scan_date && (
                <FieldRow label="Last Price Check" value={part.specs.price_scan_date} />
              )}
              {/* Date added */}
              <FieldRow label="Date Added" value={new Date(part.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} isLast />
            </>
          )}
        </PanelCard>

        {/* Specs (view only for now) */}
        {!editing && part.specs && Object.keys(part.specs).length > 0 && (
          <>
            <EngravingLabel label="Specifications" />
            <PanelCard>
              {Object.entries(part.specs).map(([key, val], i, arr) => (
                <FieldRow key={key} label={key} value={String(val)} isLast={i === arr.length - 1} />
              ))}
            </PanelCard>
          </>
        )}

        {/* Locations */}
        {!editing && locations.length > 0 && (
          <>
            <EngravingLabel label="Locations" />
            <PanelCard>
              {locations.map((pl, i) => (
                <FieldRow key={pl.id} label={pl.location.name} value={`${pl.quantity} here`} isLast={i === locations.length - 1} />
              ))}
            </PanelCard>
          </>
        )}

        {/* Suppliers */}
        {!editing && supplierLinks.length > 0 && (
          <>
            <EngravingLabel label="Suppliers" />
            <PanelCard>
              {supplierLinks.map((sl, i) => (
                <FieldRow key={sl.id} label={sl.supplier.name}
                  value={sl.last_price != null ? `$${sl.last_price.toFixed(2)}` : 'View'}
                  valueColor={colors.accent}
                  onPress={sl.product_url ? () => Linking.openURL(sl.product_url!) : undefined}
                  isLast={i === supplierLinks.length - 1} />
              ))}
            </PanelCard>
          </>
        )}

        {/* Datasheet */}
        {!editing && part.datasheet_url && (
          <View style={{ marginTop: 8 }}>
            <PrimaryButton label="View Datasheet" icon="document-text-outline" onPress={() => Linking.openURL(part.datasheet_url!)} />
          </View>
        )}

        {/* Reorder — removed, Price Check is now above metrics */}
      </ScrollView>
    </ScreenLayout>
  );
}

// ─── EDIT FIELD COMPONENT ───
function EditField({ label, value, onChangeText, colors, multiline, numeric, isLast }: {
  label: string; value: string; onChangeText: (t: string) => void;
  colors: { textMuted: string; textSecondary: string; textDisabled: string; bgDeep: string; borderDefault: string; borderSubtle: string }; multiline?: boolean; numeric?: boolean; isLast?: boolean;
}) {
  return (
    <View style={[s.editRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }]}>
      <Text style={[s.editLabel, { color: colors.textMuted }]}>{label.toUpperCase()}</Text>
      <TextInput
        style={[s.editInput, { color: colors.textSecondary, backgroundColor: colors.bgDeep, borderColor: colors.borderDefault },
          multiline && { minHeight: 60, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textDisabled}
        placeholder={`Enter ${label.toLowerCase()}…`}
        keyboardType={numeric ? 'number-pad' : 'default'}
        multiline={multiline}
      />
    </View>
  );
}

const s = StyleSheet.create({
  editBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 8, gap: 6, borderBottomWidth: 1,
  },
  editBarText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.05 },
  editBarBtn: { borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6 },
  editBarBtnText: { fontSize: 14, fontWeight: '700' },
  editRow: { paddingHorizontal: 12, paddingVertical: 10 },
  editLabel: { fontSize: 14, fontWeight: '700', letterSpacing: 0.05, marginBottom: 6 },
  editInput: { fontSize: 16, fontWeight: '600', borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 8 },
  supplierPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 10, gap: 6, minHeight: 44 },
  fieldRowWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, minHeight: 44 },
  fieldLabel: { fontSize: 14, fontWeight: '700', letterSpacing: 0.05 },
  priceCheckBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginTop: 4, borderRadius: 4, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48 },
  findItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginTop: 8, borderRadius: 4, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48 },
  adjusterWrap: { marginHorizontal: 12, marginTop: 8, borderRadius: 4, padding: 14, borderWidth: 0.5 },
  lowStockBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingVertical: 6, marginTop: 8, gap: 4 },
  photoRow: { flexDirection: 'row', height: 160 },
  photoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: 140 },
  photoLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
  fetchImageBtn: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 4, margin: 8 },
  noPhotoBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderBottomWidth: 0.5 },
});
