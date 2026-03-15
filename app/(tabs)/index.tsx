import { View, Text, ScrollView, Pressable } from 'react-native';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import { getLowStockParts } from '@/lib/notifications';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { parts, fetchParts } = useInventoryStore();

  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchParts().catch(() => {});
    }
  }, [fetchParts]);

  const lowStockParts = useMemo(() => getLowStockParts(parts), [parts]);
  const outOfStockParts = useMemo(() => parts.filter((p) => p.quantity === 0), [parts]);
  const totalParts = parts.length;
  const totalQuantity = useMemo(
    () => parts.reduce((sum, p) => sum + p.quantity, 0),
    [parts]
  );
  const categories = useMemo(() => {
    const cats = new Set(parts.map((p) => p.category).filter(Boolean));
    return cats.size;
  }, [parts]);

  return (
    <View className="flex-1 bg-screen" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Header */}
        <View className="px-md pb-sm pt-xl">
          <Text className="text-title text-text-primary">MakerVault</Text>
        </View>

        {/* Alert banners */}
        {outOfStockParts.length > 0 && (
          <Pressable
            className="mx-0 px-md py-[7px]"
            style={{ backgroundColor: 'rgba(240,80,50,0.08)', borderBottomWidth: 0.5, borderBottomColor: 'rgba(240,80,50,0.15)' }}
            onPress={() => router.push('/(tabs)/inventory')}
          >
            <Text className="text-field font-medium text-status-out">
              {outOfStockParts.length} item{outOfStockParts.length !== 1 ? 's' : ''} out of stock
            </Text>
            <Text className="text-meta text-text-faint">Tap to view affected parts</Text>
          </Pressable>
        )}
        {lowStockParts.length > 0 && outOfStockParts.length === 0 && (
          <Pressable
            className="mx-0 px-md py-[7px]"
            style={{ backgroundColor: 'rgba(240,160,48,0.07)', borderBottomWidth: 0.5, borderBottomColor: 'rgba(240,160,48,0.15)' }}
            onPress={() => router.push('/(tabs)/inventory')}
          >
            <Text className="text-field font-medium text-status-low">
              {lowStockParts.length} item{lowStockParts.length !== 1 ? 's' : ''} running low
            </Text>
            <Text className="text-meta text-text-faint">Tap to review stock levels</Text>
          </Pressable>
        )}

        {/* Stat tiles */}
        <View className="mx-md mt-lg flex-row gap-[5px]">
          <StatTile value={String(totalParts)} label="PARTS" />
          <StatTile value={String(totalQuantity)} label="TOTAL QTY" />
          <StatTile value={String(categories)} label="CATEGORIES" />
        </View>

        {/* Low stock section */}
        {lowStockParts.length > 0 && (
          <View className="mt-lg">
            <Text className="text-section uppercase px-md pb-[3px] text-text-ghost tracking-wider">
              LOW STOCK · {lowStockParts.length} ITEMS
            </Text>
            {lowStockParts.slice(0, 5).map((part) => (
              <ListRow
                key={part.id}
                label={part.name}
                meta={`${part.quantity} left · threshold ${part.low_stock_threshold}`}
                abbr={getAbbr(part.category ?? part.name)}
                badge={part.quantity === 0 ? 'out' : 'low'}
                onPress={() => router.push(`/part/${part.id}`)}
              />
            ))}
          </View>
        )}

        {/* Recently added */}
        {parts.length > 0 && (
          <View className="mt-lg">
            <Text className="text-section uppercase px-md pb-[3px] text-text-ghost tracking-wider">
              RECENT · {Math.min(parts.length, 5)} ITEMS
            </Text>
            {parts.slice(0, 5).map((part) => (
              <ListRow
                key={part.id}
                label={part.name}
                meta={[part.category, part.manufacturer].filter(Boolean).join(' · ')}
                abbr={getAbbr(part.category ?? part.name)}
                count={part.quantity}
                onPress={() => router.push(`/part/${part.id}`)}
              />
            ))}
          </View>
        )}

        {/* Empty state */}
        {parts.length === 0 && (
          <View className="mx-md mt-xl items-center rounded-lg bg-card py-xl px-lg" style={{ borderWidth: 0.5, borderColor: '#2a2a2a' }}>
            <MaterialIcons name="inventory-2" size={40} color="#555555" />
            <Text className="mt-sm text-item text-text-secondary">Your vault is empty</Text>
            <Text className="mt-xs text-meta text-text-ghost text-center">
              Scan a component or add parts manually to start building your inventory
            </Text>
            <Pressable
              className="mt-lg rounded-md px-lg py-[9px]"
              style={{ backgroundColor: 'rgba(240,160,48,0.12)', borderWidth: 0.5, borderColor: '#634010' }}
              onPress={() => router.push('/(tabs)/scan')}
            >
              <Text className="text-input font-medium text-amber-500">Scan Your First Part</Text>
            </Pressable>
          </View>
        )}

        {/* Quick nav */}
        <View className="mt-lg">
          <Text className="text-section uppercase px-md pb-[3px] text-text-ghost tracking-wider">
            QUICK ACCESS
          </Text>
          <ListRow
            label="Storage Locations"
            meta="Manage bins, shelves, and drawers"
            abbr="LOC"
            onPress={() => router.push('/locations')}
          />
          <ListRow
            label="Wishlist"
            meta="Parts to order"
            abbr="WL"
            onPress={() => router.push('/wishlist')}
          />
          <ListRow
            label="Settings"
            meta="Account, notifications, about"
            abbr="SET"
            onPress={() => router.push('/modal')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <View
      className="flex-1 items-center rounded-md bg-card py-[7px] px-[5px]"
      style={{ borderWidth: 0.5, borderColor: '#2a2a2a' }}
    >
      <Text className="text-stat text-amber-500">{value}</Text>
      <Text className="text-badge text-text-faint mt-[2px]">{label}</Text>
    </View>
  );
}

function ListRow({
  label,
  meta,
  abbr,
  badge,
  count,
  onPress,
}: {
  label: string;
  meta?: string;
  abbr: string;
  badge?: 'ok' | 'low' | 'out';
  count?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="flex-row items-center px-md py-sm"
      style={{ borderBottomWidth: 0.5, borderBottomColor: '#1e1e1e' }}
      onPress={onPress}
    >
      {/* Icon box */}
      <View
        className="h-[28px] w-[28px] items-center justify-center rounded-md bg-surface"
        style={{ borderWidth: 0.5, borderColor: '#2e2e2e' }}
      >
        <Text className="text-[10px] font-medium text-text-muted">{abbr}</Text>
      </View>

      {/* Content */}
      <View className="ml-sm flex-1">
        <Text className="text-item text-text-secondary" numberOfLines={1}>{label}</Text>
        {meta ? <Text className="text-meta text-text-muted" numberOfLines={1}>{meta}</Text> : null}
      </View>

      {/* Right side */}
      {badge && <StatusBadge type={badge} />}
      {count !== undefined && !badge && (
        <Text className="text-item text-text-muted">{count}</Text>
      )}
    </Pressable>
  );
}

function StatusBadge({ type }: { type: 'ok' | 'low' | 'out' }) {
  const config = {
    ok: { bg: 'rgba(50,180,100,0.10)', color: '#32b464', text: 'OK' },
    low: { bg: 'rgba(240,160,48,0.12)', color: '#f0a030', text: 'LOW' },
    out: { bg: 'rgba(240,80,50,0.13)', color: '#f05032', text: 'OUT' },
  }[type];

  return (
    <View className="rounded-sm px-[6px] py-[2px]" style={{ backgroundColor: config.bg }}>
      <Text className="text-badge" style={{ color: config.color }}>{config.text}</Text>
    </View>
  );
}

function getAbbr(text: string): string {
  const abbrs: Record<string, string> = {
    resistor: 'RES', capacitor: 'CAP', inductor: 'IND', led: 'LED',
    transistor: 'TRN', diode: 'DIO', ic: 'IC', microcontroller: 'MCU',
    sensor: 'SNS', motor: 'MOT', cable: 'CBL', connector: 'CON',
    relay: 'RLY', fuse: 'FUS', crystal: 'XTL', battery: 'BAT',
    switch: 'SW', display: 'DSP', module: 'MOD',
  };
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(abbrs)) {
    if (lower.includes(key)) return val;
  }
  return text.slice(0, 3).toUpperCase();
}
