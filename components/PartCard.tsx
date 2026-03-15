import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { Part } from '@/lib/types';

interface PartCardProps {
  part: Part;
}

export function PartCard({ part }: PartCardProps) {
  const router = useRouter();
  const isLowStock = part.quantity <= part.low_stock_threshold;

  return (
    <Pressable
      className="mx-4 mb-3 rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-800"
      onPress={() => router.push(`/part/${part.id}`)}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {part.name}
          </Text>
          {part.manufacturer && (
            <Text className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {part.manufacturer}
              {part.mpn ? ` — ${part.mpn}` : ''}
            </Text>
          )}
          {part.category && (
            <View className="mt-1.5 flex-row items-center">
              <View className="rounded-full bg-primary/10 px-2.5 py-0.5">
                <Text className="text-xs font-medium text-primary">
                  {part.category}
                </Text>
              </View>
              {part.subcategory && (
                <Text className="ml-2 text-xs text-zinc-400">
                  {part.subcategory}
                </Text>
              )}
            </View>
          )}
        </View>
        <View className="items-center">
          <Text
            className={`text-2xl font-bold ${
              isLowStock ? 'text-warning' : 'text-zinc-900 dark:text-zinc-100'
            }`}
          >
            {part.quantity}
          </Text>
          {isLowStock && (
            <View className="mt-1 flex-row items-center">
              <MaterialIcons name="warning" size={12} color="#f59e0b" />
              <Text className="ml-0.5 text-xs text-warning">Low</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
