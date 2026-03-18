import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ScreenLayout, ScreenHeader, EngravingLabel, PanelCard,
  ItemRow, EmptyState,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';

interface Category {
  id: string;
  name: string;
  icon: string;
  colour: string;
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
}

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { parts } = useInventoryStore();

  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    (async () => {
      setIsLoading(true);

      // Fetch category
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();

      if (catData) setCategory(catData as Category);

      // Fetch subcategories
      const { data: subData } = await supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', id)
        .order('sort_order', { ascending: true });

      if (subData) setSubcategories(subData as Subcategory[]);

      setIsLoading(false);
    })();
  }, [id]);

  // Same keyword mapping as search screen for accurate counting
  const CAT_KEYWORDS: Record<string, string[]> = {
    'electronics': ['resistor', 'capacitor', 'inductor', 'led', 'diode', 'transistor', 'ic', 'microcontroller', 'sensor', 'connector', 'switch', 'relay', 'crystal', 'fuse', 'display', 'module', 'cable', 'wire', 'board', 'arduino', 'raspberry', 'esp', 'power', 'voltage', 'charger', 'adapter', 'usb', 'hdmi', 'electronic'],
    'fasteners': ['bolt', 'screw', 'nut', 'washer', 'rivet', 'standoff', 'anchor', 'clip', 'pin', 'insert', 'fastener'],
    'tools': ['tool', 'hammer', 'wrench', 'screwdriver', 'plier', 'solder', 'multimeter', 'clamp', 'saw', 'drill', 'cutter', 'measure'],
    '3d printing': ['filament', 'pla', 'petg', 'abs', 'resin', 'nozzle', 'hotend', 'printer', '3d print', 'bed', 'stepper'],
    'materials': ['alumin', 'steel', 'wood', 'timber', 'acrylic', 'foam', 'adhesive', 'tape', 'sheet', 'stock', 'material', 'copper', 'pcb'],
    'mechanical': ['bearing', 'belt', 'pulley', 'spring', 'gear', 'rail', 'motor', 'coupling', 'actuator', 'servo', 'mechanical'],
    'safety & ppe': ['safety', 'glove', 'goggle', 'mask', 'respirator', 'ear', 'protection', 'ppe'],
  };

  const matchesCategory = (p: typeof parts[0], catName: string): boolean => {
    const keywords = CAT_KEYWORDS[catName.toLowerCase()] ?? [catName.toLowerCase()];
    const pCat = (p.category ?? '').toLowerCase();
    const pName = p.name.toLowerCase();
    const pSub = (p.subcategory ?? '').toLowerCase();
    return keywords.some((kw) => pCat.includes(kw) || pName.includes(kw) || pSub.includes(kw)) || pCat.includes(catName.toLowerCase());
  };

  const categoryParts = category ? parts.filter((p) => matchesCategory(p, category.name)) : [];
  const categoryPartCount = categoryParts.length;

  // Count parts matching each subcategory
  const getSubcategoryCount = (subName: string) => {
    const lower = subName.toLowerCase();
    return categoryParts.filter(
      (p) =>
        (p.subcategory ?? '').toLowerCase().includes(lower) ||
        (p.category ?? '').toLowerCase().includes(lower) ||
        p.name.toLowerCase().includes(lower)
    ).length;
  };

  if (isLoading) {
    return (
      <ScreenLayout style={{ paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Loading..." backLabel="Search" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </ScreenLayout>
    );
  }

  if (!category) {
    return (
      <ScreenLayout style={{ paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState
          icon="alert-circle-outline"
          title="CATEGORY NOT FOUND"
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={category.name}
        subtitle={`${categoryPartCount} parts · ${subcategories.length} subcategories`}
        backLabel="Search"
        onBack={() => router.back()}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Category icon header */}
        <View style={[s.catHeader, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderDefault }]}>
          <View style={[s.catIconBox, { backgroundColor: category.colour + '15', borderColor: category.colour + '40' }]}>
            <Ionicons name={category.icon as any} size={32} color={category.colour} />
          </View>
          <Text style={[s.catCount, { color: colors.textMuted }]}>
            {categoryPartCount} PARTS IN THIS CATEGORY
          </Text>
        </View>

        {/* Subcategories */}
        {subcategories.length > 0 && (
          <>
            <EngravingLabel label="Subcategories" />
            <PanelCard>
              {subcategories.map((sub, i) => {
                const count = getSubcategoryCount(sub.name);
                return (
                  <TouchableOpacity
                    key={sub.id}
                    activeOpacity={0.75}
                    style={[
                      s.subRow,
                      { backgroundColor: colors.bgDeep },
                      i < subcategories.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
                    ]}
                    onPress={() => router.push({
                      pathname: '/(tabs)/inventory',
                      params: { filterCategory: sub.name },
                    })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.subName, { color: colors.textSecondary }]}>{sub.name}</Text>
                      <Text style={[s.subCount, { color: colors.textMuted }]}>{count} items</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
                  </TouchableOpacity>
                );
              })}
            </PanelCard>
          </>
        )}

        {/* Parts in this category */}
        {categoryPartCount > 0 && (
          <>
            <EngravingLabel label={`All ${category.name} parts · ${categoryPartCount}`} />
            <PanelCard>
              {categoryParts
                .slice(0, 20)
                .map((part, i, arr) => (
                  <ItemRow
                    key={part.id}
                    iconLabel={part.name.slice(0, 3).toUpperCase()}
                    imageUri={part.image_url ?? undefined}
                    name={part.name}
                    meta={[part.subcategory, part.manufacturer].filter(Boolean).join(' · ') || undefined}
                    rightText={String(part.quantity)}
                    status={part.quantity === 0 ? 'out' : part.quantity <= part.low_stock_threshold ? 'low' : 'none'}
                    isLast={i === arr.length - 1}
                    onPress={() => router.push(`/part/${part.id}`)}
                  />
                ))}
            </PanelCard>
          </>
        )}

        {categoryPartCount === 0 && (
          <EmptyState
            icon="cube-outline"
            title={`NO ${category.name.toUpperCase()} PARTS YET`}
            subtitle="Scan or add parts to see them here"
            actionLabel="Scan a part"
            onAction={() => router.push('/(tabs)/scan')}
          />
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  catHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  catIconBox: {
    width: 64,
    height: 64,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  catCount: {
    fontSize: 14,
    letterSpacing: 0.05,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    minHeight: 52,
  },
  subName: {
    fontSize: 16,
    fontWeight: '700',
  },
  subCount: {
    fontSize: 14,
    marginTop: 2,
  },
});
