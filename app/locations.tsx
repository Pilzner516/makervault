import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
let ExpoFile: any = null;
let Paths: any = null;
let Sharing: any = null;
try { const fs = require('expo-file-system'); ExpoFile = fs.File; Paths = fs.Paths; } catch {}
try { Sharing = require('expo-sharing'); } catch {}
import {
  ScreenLayout, ScreenHeader,
  EngravingLabel, PanelCard,
  EmptyState,
  Spacing, FontSize, Radius,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { LocationTree } from '@/components/LocationTree';
import { QRCodeLabel } from '@/components/QRCodeLabel';
import type { StorageLocation, Part } from '@/lib/types';

export default function LocationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
  const qrSvgRef = useRef<{ toDataURL: (cb: (data: string) => void) => void } | null>(null);
  const [isSharing, setIsSharing] = useState(false);

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

  const handleShareQR = async () => {
    if (!qrSvgRef.current || !selectedLocation) return;
    setIsSharing(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing not available', 'Sharing is not supported on this device.');
        setIsSharing(false);
        return;
      }
      qrSvgRef.current.toDataURL(async (base64: string) => {
        try {
          const filename = `QR-${selectedLocation.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
          const file = new ExpoFile(Paths.cache, filename);
          file.write(base64, { encoding: 'base64' });
          const fileUri = file.uri;
          await Sharing.shareAsync(fileUri, {
            mimeType: 'image/png',
            dialogTitle: `QR Code — ${selectedLocation.name}`,
          });
        } catch {
          Alert.alert('Export failed', 'Could not save the QR code image.');
        } finally {
          setIsSharing(false);
        }
      });
    } catch {
      Alert.alert('Export failed', 'Could not generate the QR code image.');
      setIsSharing(false);
    }
  };

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Storage Locations" subtitle={`${locations.length} locations`} backLabel="Close" onBack={() => router.back()} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
        {locations.length === 0 && !isLoading ? (
          <EmptyState
            icon="location-outline"
            title="No locations yet"
            subtitle="Create storage locations to organize your parts"
            actionLabel="Add Location"
            onAction={openAddModal}
          />
        ) : (
          <>
            <EngravingLabel label="All locations" />
            <LocationTree
              locations={locations}
              onSelect={handleSelect}
              onEdit={handleEdit}
              selectedId={selectedLocation?.id}
            />
          </>
        )}

        {/* Parts in selected location */}
        {selectedLocation && (
          <>
            <EngravingLabel label={`Parts in ${selectedLocation.name}`} />
            {locationParts.length === 0 ? (
              <Text style={{ fontSize: FontSize.sm, color: colors.textFaint, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }}>
                No parts stored here
              </Text>
            ) : (
              <PanelCard>
                {locationParts.map((part, i) => (
                  <View
                    key={part.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingHorizontal: Spacing.md, paddingVertical: 13, backgroundColor: colors.bgRow,
                      ...(i < locationParts.length - 1
                        ? { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }
                        : {}),
                    }}
                  >
                    <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.textSecondary }}>{part.name}</Text>
                    <Text style={{ fontSize: FontSize.sm, color: colors.textMuted }}>{part.quantity}</Text>
                  </View>
                ))}
              </PanelCard>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB to add location */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={{
          position: 'absolute', right: 16, bottom: insets.bottom + 16,
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: colors.accentBg, borderWidth: 0.5, borderColor: colors.accentBorder,
          alignItems: 'center', justifyContent: 'center',
        }}
        onPress={openAddModal}
      >
        <Ionicons name="add" size={24} color={colors.accent} />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            backgroundColor: colors.bgCard, borderTopLeftRadius: Radius.card, borderTopRightRadius: Radius.card,
            paddingHorizontal: 20, paddingBottom: 32, paddingTop: 20,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '600', color: colors.textPrimary }}>
                {editingLocation ? 'Edit Location' : 'New Location'}
              </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: FontSize.sm, fontWeight: '500', color: colors.textMuted, marginBottom: 5 }}>Name *</Text>
            <TextInput
              style={{
                backgroundColor: colors.bgSurface, borderWidth: 0.5, borderColor: colors.borderDefault,
                borderRadius: Radius.icon, paddingHorizontal: Spacing.md, paddingVertical: 12,
                fontSize: FontSize.md, color: colors.textPrimary, marginBottom: Spacing.lg,
              }}
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g. Blue Tackle Box"
              placeholderTextColor={colors.textDisabled}
              autoFocus
            />

            <Text style={{ fontSize: FontSize.sm, fontWeight: '500', color: colors.textMuted, marginBottom: 5 }}>Description</Text>
            <TextInput
              style={{
                backgroundColor: colors.bgSurface, borderWidth: 0.5, borderColor: colors.borderDefault,
                borderRadius: Radius.icon, paddingHorizontal: Spacing.md, paddingVertical: 12,
                fontSize: FontSize.md, color: colors.textPrimary, marginBottom: Spacing.lg,
              }}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Optional description"
              placeholderTextColor={colors.textDisabled}
            />

            {editParentId && (
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: colors.accentBg, borderRadius: Radius.icon,
                paddingHorizontal: Spacing.md, paddingVertical: 8,
                marginBottom: Spacing.lg, gap: 8,
              }}>
                <Ionicons name="arrow-forward-outline" size={16} color={colors.accent} />
                <Text style={{ fontSize: FontSize.sm, color: colors.accent }}>
                  Inside: {locations.find((l) => l.id === editParentId)?.name ?? 'Parent'}
                </Text>
                <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={() => setEditParentId(null)}>
                  <Ionicons name="close" size={16} color={colors.accent} />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.75}
              style={{
                alignItems: 'center', borderRadius: Radius.card, paddingVertical: 14, borderWidth: 0.5,
                backgroundColor: editName.trim() ? colors.accentBg : colors.bgSurface,
                borderColor: editName.trim() ? colors.accentBorder : colors.borderDefault,
              }}
              onPress={handleSaveLocation}
              disabled={!editName.trim()}
            >
              <Text style={{
                fontSize: FontSize.md, fontWeight: '600',
                color: editName.trim() ? colors.accent : colors.textFaint,
              }}>
                {editingLocation ? 'Save Changes' : 'Create Location'}
              </Text>
            </TouchableOpacity>
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
        <TouchableOpacity
          activeOpacity={1}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}
          onPress={() => setShowQR(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            {selectedLocation && (
              <View style={{ alignItems: 'center', gap: 16 }}>
                <QRCodeLabel
                  locationId={selectedLocation.id}
                  locationName={selectedLocation.name}
                  size={220}
                  getRef={(ref) => { qrSvgRef.current = ref as typeof qrSvgRef.current; }}
                />
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: colors.accentBg,
                    borderWidth: 1,
                    borderColor: colors.accentBorder,
                    borderRadius: Radius.card,
                    paddingVertical: 14,
                    paddingHorizontal: 24,
                    minHeight: 48,
                    minWidth: 200,
                    opacity: isSharing ? 0.5 : 1,
                  }}
                  onPress={handleShareQR}
                  disabled={isSharing}
                >
                  <Ionicons name="share-outline" size={18} color={colors.accent} />
                  <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.accent }}>
                    {isSharing ? 'EXPORTING...' : 'PRINT / SHARE QR'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 24,
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => setShowQR(false)}
                >
                  <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.textMuted }}>
                    CLOSE
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenLayout>
  );
}
