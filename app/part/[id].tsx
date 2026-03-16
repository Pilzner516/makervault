import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, Linking, StyleSheet,
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
import { supabase } from '@/lib/supabase';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import { useSupplierStore } from '@/lib/zustand/supplierStore';
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
  const { colors } = useTheme();
  const { parts, updatePart, deletePart } = useInventoryStore();
  const { suppliers: allSuppliers, fetchAll: fetchSuppliers, mvPreferred, favourites, getSupplierUrl } = useSupplierStore();

  const part = parts.find((p) => p.id === id);
  const [locations, setLocations] = useState<LocationWithName[]>([]);
  const [supplierLinks, setSupplierLinks] = useState<SupplierLinkWithName[]>([]);

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
  const searchQuery = mpnClean ? [mpnClean, mfgClean].filter(Boolean).join(' ') : [shortName, mfgClean].filter(Boolean).join(' ');

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
        {/* Photo */}
        {part.image_url && (
          <Image source={{ uri: part.image_url }} style={{ height: 180, width: '100%', backgroundColor: colors.bgCard }} contentFit="cover" />
        )}

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

        {/* Supplier search */}
        {!editing && (
          <>
            <EngravingLabel label="Look up part" action="All suppliers" onAction={() => router.push({ pathname: '/where-to-buy', params: { itemName: searchQuery || part.name } })} />
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
              {part.category && <FieldRow label="Category" value={part.category} />}
              {part.subcategory && <FieldRow label="Subcategory" value={part.subcategory} />}
              {part.description && <FieldRow label="Description" value={part.description} />}
              {part.notes && <FieldRow label="Notes" value={part.notes} />}
              <FieldRow label="Quantity" value={String(part.quantity)} />
              <FieldRow label="Threshold" value={String(part.low_stock_threshold)} isLast />
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

        {/* Reorder */}
        {!editing && (
          <View style={{ marginTop: 4 }}>
            <SecondaryButton label="Where to Buy" icon="cart-outline"
              onPress={() => router.push({ pathname: '/where-to-buy', params: { itemName: searchQuery || part.name } })} />
          </View>
        )}
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
  adjusterWrap: { marginHorizontal: 12, marginTop: 8, borderRadius: 4, padding: 14, borderWidth: 0.5 },
  lowStockBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingVertical: 6, marginTop: 8, gap: 4 },
});
