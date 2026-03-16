import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ScreenLayout, ScreenHeader,
  EngravingLabel, PanelCard,
  EmptyState,
  Spacing, FontSize, Radius,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { openSupplierPage, getSearchUrl, SUPPLIER_CONFIGS } from '@/lib/suppliers';
import type { WishlistItem } from '@/lib/types';

export default function WishlistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="Wishlist"
        subtitle={items.length > 0 ? `${items.length} items` : undefined}
        rightElement={
          items.length > 0 ? (
            <TouchableOpacity onPress={handleExport} activeOpacity={0.7}>
              <Ionicons name="share-outline" size={22} color={colors.accent} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title="Your wishlist is empty"
          subtitle="Add parts from the price comparison screen"
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {/* Optimize banner */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            marginHorizontal: Spacing.md, marginVertical: Spacing.sm,
            backgroundColor: colors.accentBg, borderRadius: Radius.icon,
            paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
          }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '500', color: colors.accent, flex: 1 }}>
              {items.length} item{items.length !== 1 ? 's' : ''} across{' '}
              {Object.keys(grouped).length} supplier
              {Object.keys(grouped).length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity
              activeOpacity={0.75}
              style={{
                backgroundColor: colors.accentBg, borderWidth: 0.5, borderColor: colors.accentBorder,
                borderRadius: Radius.icon, paddingHorizontal: Spacing.md, paddingVertical: 6,
              }}
              onPress={handleExport}
            >
              <Text style={{ fontSize: FontSize.xs, fontWeight: '500', color: colors.accent }}>Export CSV</Text>
            </TouchableOpacity>
          </View>

          {/* Grouped by supplier */}
          {Object.entries(grouped).map(([supplier, supplierItems]) => {
            const config =
              SUPPLIER_CONFIGS[supplier] ??
              SUPPLIER_CONFIGS[supplier.replace(/\s/g, '')];
            const displayName = config?.displayName ?? supplier;

            return (
              <View key={supplier}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: 6,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <View style={{
                      width: 12, height: 12, borderRadius: 6,
                      backgroundColor: config?.color ?? colors.textMuted,
                    }} />
                    <Text style={{
                      fontSize: 10, fontWeight: '600', color: colors.textFaint,
                      letterSpacing: 0.8, textTransform: 'uppercase',
                    }}>
                      {displayName} ({supplierItems.length})
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: colors.bgSurface, borderWidth: 0.5, borderColor: colors.borderDefault,
                      borderRadius: Radius.btn, paddingHorizontal: Spacing.md, paddingVertical: 4, gap: 4,
                    }}
                    onPress={() => handleOpenAll(supplier, supplierItems)}
                  >
                    <Ionicons name="open-outline" size={14} color={colors.textFaint} />
                    <Text style={{ fontSize: FontSize.xs, color: colors.textFaint }}>Open All</Text>
                  </TouchableOpacity>
                </View>

                {supplierItems.map((item) => (
                  <View key={item.id} style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: colors.bgCard, marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
                    borderRadius: Radius.icon, paddingHorizontal: Spacing.md, paddingVertical: 13,
                    borderWidth: 0.5, borderColor: colors.borderDefault,
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.textPrimary }}>
                        {item.name}
                      </Text>
                      {item.mpn && (
                        <Text style={{ fontSize: FontSize.sm, color: colors.textMuted, marginTop: 2 }}>{item.mpn}</Text>
                      )}
                      {item.category && (
                        <View style={{
                          marginTop: 4, alignSelf: 'flex-start',
                          backgroundColor: colors.accentBg, borderRadius: Radius.badge,
                          paddingHorizontal: 8, paddingVertical: 2,
                        }}>
                          <Text style={{ fontSize: FontSize.xs, color: colors.accent }}>{item.category}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                      <TouchableOpacity
                        activeOpacity={0.7}
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
                        <Ionicons name="cart-outline" size={20} color={colors.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity activeOpacity={0.7} onPress={() => handleDelete(item)}>
                        <Ionicons name="close" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </ScreenLayout>
  );
}
