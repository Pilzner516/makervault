import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet, Alert } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ScreenLayout, ScreenHeader, SearchBar, EngravingLabel,
  PanelCard, FilterPillRow, FilterPill,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { useSupplierStore, Supplier } from '@/lib/zustand/supplierStore';

const COUNTRIES = [
  { code: 'US', label: 'USA' },
  { code: 'UK', label: 'UK' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'GLOBAL', label: 'Global' },
];

export default function AllSuppliersScreen() {
  const { itemName } = useLocalSearchParams<{ itemName: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    suppliers, fetchAll, userPrefs, userSettings,
    toggleFavourite, getSupplierUrl,
  } = useSupplierStore();

  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState(userSettings?.country_code ?? 'US');
  const query = itemName ?? '';
  const favCount = userPrefs.filter((p) => p.is_favourite).length;

  useEffect(() => {
    fetchAll().catch(() => {});
  }, [fetchAll]);

  const filtered = useMemo(() => {
    let list = suppliers.filter((s) => {
      if (s.countries.includes(countryFilter)) return true;
      if (countryFilter !== 'GLOBAL' && s.countries.includes('GLOBAL')) return true;
      return false;
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description?.toLowerCase().includes(q) ?? false) ||
        (s.category?.toLowerCase().includes(q) ?? false)
      );
    }

    return list;
  }, [suppliers, countryFilter, search]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, Supplier[]> = {};
    filtered.forEach((s) => {
      const cat = s.category ?? 'general';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });
    return groups;
  }, [filtered]);

  const isFav = (id: string) => userPrefs.find((p) => p.supplier_id === id)?.is_favourite ?? false;

  const handleToggleFav = (id: string) => {
    const fav = isFav(id);
    if (!fav && favCount >= 4) {
      Alert.alert('Maximum 4 favourites', 'Remove one before adding another.');
      return;
    }
    toggleFavourite(id);
  };

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="All suppliers"
        subtitle="Star to add to your list"
        backLabel="Back"
        onBack={() => router.back()}
      />

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search suppliers…" />

      <FilterPillRow>
        {COUNTRIES.map((c) => (
          <FilterPill
            key={c.code}
            label={c.label}
            active={countryFilter === c.code}
            onPress={() => setCountryFilter(c.code)}
          />
        ))}
      </FilterPillRow>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {Object.entries(grouped).map(([cat, sups]) => (
          <View key={cat}>
            <EngravingLabel label={cat} />
            <PanelCard>
              {sups.map((sup, i) => (
                <View
                  key={sup.id}
                  style={[s.row, i < sups.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }]}
                >
                  <View style={[s.logo, { backgroundColor: sup.logo_bg }]}>
                    <Text style={[s.logoText, { color: sup.logo_text }]}>{sup.logo_label}</Text>
                  </View>

                  <TouchableOpacity
                    style={s.info}
                    activeOpacity={0.75}
                    onPress={() => Linking.openURL(getSupplierUrl(sup, query)).catch(() => {})}
                  >
                    <Text style={[s.name, { color: colors.textSecondary }]}>{sup.name}</Text>
                    {sup.description && <Text style={[s.desc, { color: colors.textMuted }]} numberOfLines={1}>{sup.description}</Text>}
                    {sup.commission_rate && <Text style={[s.comm, { color: colors.statusOk }]}>Earn {sup.commission_rate}</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity style={s.star} onPress={() => handleToggleFav(sup.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name={isFav(sup.id) ? 'star' : 'star-outline'} size={20} color={isFav(sup.id) ? '#fcd34d' : colors.textDisabled} />
                  </TouchableOpacity>

                  {sup.is_mv_preferred && (
                    <View style={[s.mvBadge, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accent }}>MV</Text>
                    </View>
                  )}

                  <TouchableOpacity style={s.open} onPress={() => Linking.openURL(getSupplierUrl(sup, query)).catch(() => {})}>
                    <Ionicons name="open-outline" size={18} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              ))}
            </PanelCard>
          </View>
        ))}
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, minHeight: 52, gap: 8 },
  logo: { width: 56, height: 30, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontWeight: '800', letterSpacing: -0.3, fontSize: 14 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700' },
  desc: { fontSize: 14 },
  comm: { fontSize: 14 },
  star: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  mvBadge: { borderRadius: 2, borderWidth: 1, paddingHorizontal: 4, paddingVertical: 1 },
  open: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
