import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet, Alert } from 'react-native';
import { useEffect } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ScreenLayout, ScreenHeader, EngravingLabel, PanelCard,
  PrimaryButton,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { useSupplierStore, Supplier } from '@/lib/zustand/supplierStore';

export default function WhereToBuyScreen() {
  const { itemName } = useLocalSearchParams<{ itemName: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    suppliers, fetchAll, isLoading,
    favourites, mvPreferred, userEnabled,
    toggleFavourite, getSupplierUrl, userPrefs,
  } = useSupplierStore();

  useEffect(() => {
    fetchAll().catch(() => {});
  }, [fetchAll]);

  const favList = favourites();
  const mvList = mvPreferred();
  const enabledList = userEnabled();
  const query = itemName ?? '';
  const favCount = userPrefs.filter((p) => p.is_favourite).length;

  const openSupplier = (supplier: Supplier) => {
    const url = getSupplierUrl(supplier, query);
    Linking.openURL(url).catch(() => {});
  };

  const handleToggleFav = (supplierId: string) => {
    const isFav = userPrefs.find((p) => p.supplier_id === supplierId)?.is_favourite;
    if (!isFav && favCount >= 4) {
      Alert.alert('Maximum 4 favourites', 'Remove one before adding another.');
      return;
    }
    toggleFavourite(supplierId);
  };

  const isFav = (supplierId: string) =>
    userPrefs.find((p) => p.supplier_id === supplierId)?.is_favourite ?? false;

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="Where to buy"
        subtitle={query}
        backLabel="Back"
        onBack={() => router.back()}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Favourites */}
        {favList.length > 0 && (
          <>
            <EngravingLabel label="Your favourites" />
            <View style={s.favRow}>
              {favList.map((sup) => (
                <TouchableOpacity
                  key={sup.id}
                  activeOpacity={0.75}
                  style={s.favCard}
                  onPress={() => openSupplier(sup)}
                >
                  <View style={[s.logoLg, { backgroundColor: sup.logo_bg }]}>
                    <Text style={[s.logoText, { color: sup.logo_text, fontSize: 14 }]}>{sup.logo_label}</Text>
                  </View>
                  <Text style={[s.favName, { color: colors.textSecondary }]}>{sup.name}</Text>
                </TouchableOpacity>
              ))}
              {favList.length < 4 && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[s.favCard, { borderStyle: 'dashed', borderWidth: 1, borderColor: colors.borderDefault }]}
                  onPress={() => router.push({ pathname: '/all-suppliers', params: { itemName: query } })}
                >
                  <Ionicons name="add" size={24} color={colors.textMuted} />
                  <Text style={[s.favName, { color: colors.textMuted }]}>ADD</Text>
                </TouchableOpacity>
              )}
            </View>
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
                  onToggleFav={() => handleToggleFav(sup.id)}
                  onOpen={() => openSupplier(sup)}
                  colors={colors}
                  isLast={i === enabledList.length - 1}
                />
              ))}
            </PanelCard>
          </>
        )}

        {/* All suppliers button */}
        <View style={{ marginTop: 8 }}>
          <PrimaryButton
            label={`Browse all ${suppliers.length} suppliers`}
            icon="globe-outline"
            onPress={() => router.push({ pathname: '/all-suppliers', params: { itemName: query } })}
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

function SupplierRow({
  supplier, isFav, onToggleFav, onOpen, colors, isLast,
}: {
  supplier: Supplier;
  isFav: boolean;
  onToggleFav: () => void;
  onOpen: () => void;
  colors: { textSecondary: string; textMuted: string; textDisabled: string; accent: string; accentBg: string; accentBorder: string; borderSubtle: string; statusOk: string };
  isLast?: boolean;
}) {
  return (
    <View style={[s.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }]}>
      {/* Logo */}
      <View style={[s.logoMd, { backgroundColor: supplier.logo_bg }]}>
        <Text style={[s.logoText, { color: supplier.logo_text }]}>{supplier.logo_label}</Text>
      </View>

      {/* Info */}
      <TouchableOpacity style={s.rowInfo} activeOpacity={0.75} onPress={onOpen}>
        <Text style={[s.rowName, { color: colors.textSecondary }]}>{supplier.name}</Text>
        {supplier.description && (
          <Text style={[s.rowDesc, { color: colors.textMuted }]} numberOfLines={1}>{supplier.description}</Text>
        )}
        {supplier.commission_rate && (
          <Text style={[s.rowComm, { color: colors.statusOk }]}>Earn {supplier.commission_rate} commission</Text>
        )}
      </TouchableOpacity>

      {/* Star */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggleFav}
        style={s.starBtn}
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
        <View style={[s.mvBadge, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
          <Text style={[s.mvBadgeText, { color: colors.accent }]}>MV</Text>
        </View>
      )}

      {/* Open */}
      <TouchableOpacity activeOpacity={0.7} onPress={onOpen} style={s.openBtn}>
        <Ionicons name="open-outline" size={18} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  favRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  favCard: {
    width: 72,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 4,
  },
  favName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  logoLg: {
    width: 72, height: 38, borderRadius: 3,
    alignItems: 'center', justifyContent: 'center',
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
  rowDesc: {
    fontSize: 14,
  },
  rowComm: {
    fontSize: 14,
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
