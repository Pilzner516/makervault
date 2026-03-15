import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { supabase } from '@/lib/supabase';
import { LocationTree } from '@/components/LocationTree';
import { QRCodeLabel } from '@/components/QRCodeLabel';
import type { StorageLocation, Part } from '@/lib/types';

export default function LocationsScreen() {
  const insets = useSafeAreaInsets();
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<StorageLocation | null>(null);
  const [locationParts, setLocationParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Add/edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editParentId, setEditParentId] = useState<string | null>(null);

  // QR modal
  const [showQR, setShowQR] = useState(false);

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('storage_locations')
      .select('*')
      .order('name');
    if (!error && data) setLocations(data as StorageLocation[]);
    setIsLoading(false);
  }, []);

  const fetchLocationParts = useCallback(async (locationId: string) => {
    const { data, error } = await supabase
      .from('part_locations')
      .select('part_id, quantity, parts(*)')
      .eq('location_id', locationId);
    if (!error && data) {
      setLocationParts(
        data
          .map((pl: Record<string, unknown>) => pl.parts as Part)
          .filter(Boolean)
      );
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    if (selectedLocation) {
      fetchLocationParts(selectedLocation.id);
    } else {
      setLocationParts([]);
    }
  }, [selectedLocation, fetchLocationParts]);

  const handleSelect = (location: StorageLocation) => {
    setSelectedLocation(
      selectedLocation?.id === location.id ? null : location
    );
  };

  const handleEdit = (location: StorageLocation) => {
    Alert.alert(location.name, undefined, [
      {
        text: 'Edit',
        onPress: () => {
          setEditingLocation(location);
          setEditName(location.name);
          setEditDescription(location.description ?? '');
          setEditParentId(location.parent_id);
          setShowEditModal(true);
        },
      },
      {
        text: 'QR Code',
        onPress: () => {
          setSelectedLocation(location);
          setShowQR(true);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDelete(location),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleDelete = (location: StorageLocation) => {
    Alert.alert(
      'Delete Location',
      `Remove "${location.name}"? Parts will be unlinked but not deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('storage_locations').delete().eq('id', location.id);
            if (selectedLocation?.id === location.id) setSelectedLocation(null);
            fetchLocations();
          },
        },
      ]
    );
  };

  const handleSaveLocation = async () => {
    if (!editName.trim()) return;
    if (editingLocation) {
      await supabase
        .from('storage_locations')
        .update({
          name: editName.trim(),
          description: editDescription.trim() || null,
          parent_id: editParentId,
        })
        .eq('id', editingLocation.id);
    } else {
      await supabase.from('storage_locations').insert({
        name: editName.trim(),
        description: editDescription.trim() || null,
        parent_id: editParentId,
        qr_code: `makervault-${Date.now()}`,
      });
    }
    setShowEditModal(false);
    setEditingLocation(null);
    setEditName('');
    setEditDescription('');
    setEditParentId(null);
    fetchLocations();
  };

  const openAddModal = () => {
    setEditingLocation(null);
    setEditName('');
    setEditDescription('');
    setEditParentId(selectedLocation?.id ?? null);
    setShowEditModal(true);
  };

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ title: 'Storage Locations', headerShown: true }} />

      <ScrollView className="flex-1 px-4 pt-3">
        <LocationTree
          locations={locations}
          onSelect={handleSelect}
          onEdit={handleEdit}
          selectedId={selectedLocation?.id}
        />

        {/* Parts in selected location */}
        {selectedLocation && (
          <View className="mt-4 rounded-xl bg-white p-4 dark:bg-zinc-800">
            <Text className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Parts in {selectedLocation.name}
            </Text>
            {locationParts.length === 0 ? (
              <Text className="text-sm text-zinc-400">No parts stored here</Text>
            ) : (
              locationParts.map((part) => (
                <View
                  key={part.id}
                  className="flex-row items-center justify-between border-b border-zinc-100 py-2 last:border-b-0 dark:border-zinc-700"
                >
                  <Text className="text-base text-zinc-900 dark:text-zinc-100">
                    {part.name}
                  </Text>
                  <Text className="text-sm text-zinc-500">{part.quantity}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* FAB to add location */}
      <Pressable
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:bg-primary/80"
        onPress={openAddModal}
      >
        <MaterialIcons name="create-new-folder" size={24} color="#ffffff" />
      </Pressable>

      {/* Add/Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-5 dark:bg-zinc-900">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {editingLocation ? 'Edit Location' : 'New Location'}
              </Text>
              <Pressable onPress={() => setShowEditModal(false)}>
                <MaterialIcons name="close" size={24} color="#71717a" />
              </Pressable>
            </View>

            <Text className="mb-1.5 text-sm font-medium text-zinc-500">Name *</Text>
            <TextInput
              className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g. Blue Tackle Box"
              placeholderTextColor="#a1a1aa"
              autoFocus
            />

            <Text className="mb-1.5 text-sm font-medium text-zinc-500">Description</Text>
            <TextInput
              className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Optional description"
              placeholderTextColor="#a1a1aa"
            />

            {editParentId && (
              <View className="mb-4 flex-row items-center rounded-lg bg-primary/10 px-3 py-2">
                <MaterialIcons name="subdirectory-arrow-right" size={16} color="#0a7ea4" />
                <Text className="ml-2 text-sm text-primary">
                  Inside: {locations.find((l) => l.id === editParentId)?.name ?? 'Parent'}
                </Text>
                <Pressable className="ml-auto" onPress={() => setEditParentId(null)}>
                  <MaterialIcons name="close" size={16} color="#0a7ea4" />
                </Pressable>
              </View>
            )}

            <Pressable
              className={`items-center rounded-xl py-4 ${
                editName.trim() ? 'bg-primary' : 'bg-zinc-200'
              }`}
              onPress={handleSaveLocation}
              disabled={!editName.trim()}
            >
              <Text
                className={`text-base font-semibold ${
                  editName.trim() ? 'text-white' : 'text-zinc-400'
                }`}
              >
                {editingLocation ? 'Save Changes' : 'Create Location'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={showQR}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQR(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/60"
          onPress={() => setShowQR(false)}
        >
          {selectedLocation && (
            <QRCodeLabel
              locationId={selectedLocation.id}
              locationName={selectedLocation.name}
              size={200}
            />
          )}
        </Pressable>
      </Modal>
    </View>
  );
}
