import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NewPart } from '@/lib/types';

const CATEGORIES = [
  'Resistor', 'Capacitor', 'Inductor', 'Transistor', 'Diode', 'LED',
  'IC', 'Microcontroller', 'Sensor', 'Connector', 'Cable', 'Switch',
  'Relay', 'Motor', 'Display', 'Battery', 'PCB', 'Other',
];

interface AddPartSheetProps {
  onSubmit: (part: NewPart) => void;
  onClose: () => void;
}

export function AddPartSheet({ onSubmit, onClose }: AddPartSheetProps) {
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [mpn, setMpn] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [description, setDescription] = useState('');
  const [threshold, setThreshold] = useState('5');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      manufacturer: manufacturer.trim() || null,
      mpn: mpn.trim() || null,
      category,
      subcategory: null,
      description: description.trim() || null,
      specs: null,
      quantity: parseInt(quantity, 10) || 0,
      low_stock_threshold: parseInt(threshold, 10) || 5,
      image_url: null,
      datasheet_url: null,
      notes: null,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <View className="flex-1 bg-black/50">
        <View className="mt-auto max-h-[85%] rounded-t-3xl bg-white dark:bg-zinc-900">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
            <Pressable onPress={onClose}>
              <Text className="text-base text-zinc-500">Cancel</Text>
            </Pressable>
            <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Add Part
            </Text>
            <Pressable onPress={handleSubmit} disabled={!name.trim()}>
              <Text
                className={`text-base font-semibold ${
                  name.trim() ? 'text-primary' : 'text-zinc-300'
                }`}
              >
                Save
              </Text>
            </Pressable>
          </View>

          <ScrollView className="px-5 py-4" keyboardShouldPersistTaps="handled">
            {/* Name */}
            <Text className="mb-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Part Name *
            </Text>
            <TextInput
              className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              value={name}
              onChangeText={setName}
              placeholder="e.g. 10k Resistor"
              placeholderTextColor="#a1a1aa"
            />

            {/* Manufacturer & MPN */}
            <View className="mb-4 flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Manufacturer
                </Text>
                <TextInput
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  value={manufacturer}
                  onChangeText={setManufacturer}
                  placeholder="e.g. Texas Instruments"
                  placeholderTextColor="#a1a1aa"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  MPN
                </Text>
                <TextInput
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  value={mpn}
                  onChangeText={setMpn}
                  placeholder="Part number"
                  placeholderTextColor="#a1a1aa"
                />
              </View>
            </View>

            {/* Category */}
            <Text className="mb-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              <View className="flex-row gap-2">
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    className={`rounded-full px-3 py-1.5 ${
                      category === cat.toLowerCase()
                        ? 'bg-primary'
                        : 'bg-zinc-100 dark:bg-zinc-800'
                    }`}
                    onPress={() =>
                      setCategory(
                        category === cat.toLowerCase() ? null : cat.toLowerCase()
                      )
                    }
                  >
                    <Text
                      className={`text-sm ${
                        category === cat.toLowerCase()
                          ? 'font-medium text-white'
                          : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Quantity & Threshold */}
            <View className="mb-4 flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Quantity
                </Text>
                <TextInput
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  placeholderTextColor="#a1a1aa"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Low Stock Alert
                </Text>
                <TextInput
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  value={threshold}
                  onChangeText={setThreshold}
                  keyboardType="number-pad"
                  placeholderTextColor="#a1a1aa"
                />
              </View>
            </View>

            {/* Description */}
            <Text className="mb-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Description
            </Text>
            <TextInput
              className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              value={description}
              onChangeText={setDescription}
              placeholder="Notes about this part..."
              placeholderTextColor="#a1a1aa"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Submit button */}
            <Pressable
              className={`mb-8 items-center rounded-xl py-4 ${
                name.trim() ? 'bg-primary active:bg-primary/80' : 'bg-zinc-200'
              }`}
              onPress={handleSubmit}
              disabled={!name.trim()}
            >
              <View className="flex-row items-center gap-2">
                <MaterialIcons
                  name="add-circle-outline"
                  size={20}
                  color={name.trim() ? '#ffffff' : '#a1a1aa'}
                />
                <Text
                  className={`text-base font-semibold ${
                    name.trim() ? 'text-white' : 'text-zinc-400'
                  }`}
                >
                  Add to Inventory
                </Text>
              </View>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
