import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '@/context/ThemeContext';
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
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [mpn, setMpn] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [description, setDescription] = useState('');
  const [threshold, setThreshold] = useState('0');

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
        <View className="mt-auto max-h-[85%] rounded-t-3xl bg-card">
          {/* Header */}
          <View
            className="flex-row items-center justify-between px-5 py-4"
            style={{ borderBottomWidth: 0.5, borderBottomColor: '#2a2a2a' }}
          >
            <Pressable onPress={onClose}>
              <Text className="text-base text-text-muted">Cancel</Text>
            </Pressable>
            <Text className="text-lg font-semibold text-text-primary">
              Add Part
            </Text>
            <Pressable onPress={handleSubmit} disabled={!name.trim()}>
              <Text
                className="text-base font-semibold"
                style={{ color: name.trim() ? colors.accent : colors.textDisabled }}
              >
                Save
              </Text>
            </Pressable>
          </View>

          <ScrollView className="px-5 py-4" keyboardShouldPersistTaps="handled">
            {/* Name */}
            <Text className="mb-1.5 text-sm font-medium text-text-muted">
              Part Name *
            </Text>
            <TextInput
              className="mb-4 rounded-md bg-surface px-3 py-3 text-base text-text-primary"
              style={{ borderWidth: 0.5, borderColor: '#2a2a2a' }}
              value={name}
              onChangeText={setName}
              placeholder="e.g. 10k Resistor"
              placeholderTextColor="#666666"
            />

            {/* Manufacturer & MPN */}
            <View className="mb-4 flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1.5 text-sm font-medium text-text-muted">
                  Manufacturer
                </Text>
                <TextInput
                  className="rounded-md bg-surface px-3 py-3 text-base text-text-primary"
                  style={{ borderWidth: 0.5, borderColor: '#2a2a2a' }}
                  value={manufacturer}
                  onChangeText={setManufacturer}
                  placeholder="e.g. Texas Instruments"
                  placeholderTextColor="#666666"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1.5 text-sm font-medium text-text-muted">
                  MPN
                </Text>
                <TextInput
                  className="rounded-md bg-surface px-3 py-3 text-base text-text-primary"
                  style={{ borderWidth: 0.5, borderColor: '#2a2a2a' }}
                  value={mpn}
                  onChangeText={setMpn}
                  placeholder="Part number"
                  placeholderTextColor="#666666"
                />
              </View>
            </View>

            {/* Category */}
            <Text className="mb-1.5 text-sm font-medium text-text-muted">
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
                    className="rounded-pill px-3 py-1.5"
                    style={
                      category === cat.toLowerCase()
                        ? { backgroundColor: colors.accentBg, borderWidth: 0.5, borderColor: colors.accentBorder }
                        : { backgroundColor: '#1a1a1a', borderWidth: 0.5, borderColor: '#2a2a2a' }
                    }
                    onPress={() =>
                      setCategory(
                        category === cat.toLowerCase() ? null : cat.toLowerCase()
                      )
                    }
                  >
                    <Text
                      className={`text-sm ${
                        category === cat.toLowerCase()
                          ? 'font-medium'
                          : 'text-text-secondary'
                      }`}
                      style={category === cat.toLowerCase() ? { color: colors.accent } : undefined}
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
                <Text className="mb-1.5 text-sm font-medium text-text-muted">
                  Quantity
                </Text>
                <TextInput
                  className="rounded-md bg-surface px-3 py-3 text-base text-text-primary"
                  style={{ borderWidth: 0.5, borderColor: '#2a2a2a' }}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  placeholderTextColor="#666666"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1.5 text-sm font-medium text-text-muted">
                  Low Stock Alert
                </Text>
                <TextInput
                  className="rounded-md bg-surface px-3 py-3 text-base text-text-primary"
                  style={{ borderWidth: 0.5, borderColor: '#2a2a2a' }}
                  value={threshold}
                  onChangeText={setThreshold}
                  keyboardType="number-pad"
                  placeholderTextColor="#666666"
                />
              </View>
            </View>

            {/* Description */}
            <Text className="mb-1.5 text-sm font-medium text-text-muted">
              Description
            </Text>
            <TextInput
              className="mb-6 rounded-md bg-surface px-3 py-3 text-base text-text-primary"
              style={{ borderWidth: 0.5, borderColor: '#2a2a2a' }}
              value={description}
              onChangeText={setDescription}
              placeholder="Notes about this part..."
              placeholderTextColor="#666666"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Submit button */}
            <Pressable
              className="mb-8 items-center rounded-lg py-4"
              style={
                name.trim()
                  ? { backgroundColor: colors.accentBg, borderWidth: 0.5, borderColor: colors.accentBorder }
                  : { backgroundColor: '#1a1a1a', borderWidth: 0.5, borderColor: '#2a2a2a' }
              }
              onPress={handleSubmit}
              disabled={!name.trim()}
            >
              <View className="flex-row items-center gap-2">
                <MaterialIcons
                  name="add-circle-outline"
                  size={20}
                  color={name.trim() ? colors.accent : '#666666'}
                />
                <Text
                  className="text-base font-semibold"
                  style={{ color: name.trim() ? colors.accent : colors.textFaint }}
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
