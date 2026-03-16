import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '@/context/ThemeContext';
import type { Part } from '@/lib/types';

interface PartCardProps {
  part: Part;
}

export function PartCard({ part }: PartCardProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const isLowStock = part.quantity <= part.low_stock_threshold;

  return (
    <Pressable
      className="mx-4 mb-3 rounded-md bg-card p-4"
      onPress={() => router.push(`/part/${part.id}`)}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-base font-semibold text-text-primary">
            {part.name}
          </Text>
          {part.manufacturer && (
            <Text className="mt-0.5 text-sm text-text-muted">
              {part.manufacturer}
              {part.mpn ? ` — ${part.mpn}` : ''}
            </Text>
          )}
          {part.category && (
            <View className="mt-1.5 flex-row items-center">
              <View
                className="rounded-sm px-2.5 py-0.5"
                style={{ backgroundColor: colors.accentBg }}
              >
                <Text className="text-xs font-medium" style={{ color: colors.accent }}>
                  {part.category}
                </Text>
              </View>
              {part.subcategory && (
                <Text className="ml-2 text-xs text-text-faint">
                  {part.subcategory}
                </Text>
              )}
            </View>
          )}
        </View>
        <View className="items-center">
          <Text
            className={`text-2xl font-bold ${
              isLowStock ? 'text-status-low' : 'text-text-primary'
            }`}
          >
            {part.quantity}
          </Text>
          {isLowStock && (
            <View className="mt-1 flex-row items-center">
              <MaterialIcons name="warning" size={12} color={colors.statusLow} />
              <Text className="ml-0.5 text-xs text-status-low">Low</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
