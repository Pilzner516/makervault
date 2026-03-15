import { View, Text, Pressable, TextInput } from 'react-native';
import { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface QuantityAdjusterProps {
  quantity: number;
  onChange: (newQuantity: number) => void;
}

export function QuantityAdjuster({ quantity, onChange }: QuantityAdjusterProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(quantity));

  const handleDecrement = () => {
    if (quantity > 0) onChange(quantity - 1);
  };

  const handleIncrement = () => {
    onChange(quantity + 1);
  };

  const handleSubmitEdit = () => {
    const parsed = parseInt(editValue, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    } else {
      setEditValue(String(quantity));
    }
    setIsEditing(false);
  };

  return (
    <View className="flex-row items-center justify-center gap-4">
      <Pressable
        className="h-12 w-12 items-center justify-center rounded-full bg-zinc-200 active:bg-zinc-300 dark:bg-zinc-700 dark:active:bg-zinc-600"
        onPress={handleDecrement}
      >
        <MaterialIcons name="remove" size={24} color="#71717a" />
      </Pressable>

      {isEditing ? (
        <TextInput
          className="h-14 w-20 rounded-lg border border-primary bg-white text-center text-3xl font-bold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
          value={editValue}
          onChangeText={setEditValue}
          onBlur={handleSubmitEdit}
          onSubmitEditing={handleSubmitEdit}
          keyboardType="number-pad"
          autoFocus
          selectTextOnFocus
        />
      ) : (
        <Pressable onPress={() => { setEditValue(String(quantity)); setIsEditing(true); }}>
          <Text className="min-w-[80px] text-center text-4xl font-bold text-zinc-900 dark:text-zinc-100">
            {quantity}
          </Text>
        </Pressable>
      )}

      <Pressable
        className="h-12 w-12 items-center justify-center rounded-full bg-primary active:bg-primary/80"
        onPress={handleIncrement}
      >
        <MaterialIcons name="add" size={24} color="#ffffff" />
      </Pressable>
    </View>
  );
}
