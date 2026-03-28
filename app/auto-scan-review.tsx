import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useCallback, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ScreenLayout, ScreenHeader, PrimaryButton, SecondaryButton,
  EngravingLabel, PanelCard,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { useAutoScanStore, AutoScanCapture } from '@/lib/zustand/autoScanStore';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import { supabase } from '@/lib/supabase';

export default function AutoScanReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { addPart, updatePart } = useInventoryStore();
  const {
    captures, updateCapture, confirmCapture, discardCapture,
    confirmAllAboveThreshold, confirmedCaptures, allReviewed, clearSession,
  } = useAutoScanStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const activeCaptures = captures.filter((c) => c.status === 'done' || c.status === 'failed');
  const current = activeCaptures[currentIndex];
  const total = activeCaptures.length;

  const goNext = () => setCurrentIndex((i) => Math.min(i + 1, total - 1));
  const goPrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));

  const handleConfirmAll = () => {
    confirmAllAboveThreshold(0.75);
  };

  const handleSaveToInventory = useCallback(async () => {
    const toSave = confirmedCaptures();
    if (toSave.length === 0) return;

    setIsSaving(true);
    let newCount = 0;
    let mergedCount = 0;

    for (const cap of toSave) {
      if (!cap.result) continue;
      try {
        // Check for existing part with same name (case-insensitive)
        const { data: existing } = await supabase
          .from('parts')
          .select('id, name, quantity')
          .ilike('name', cap.result.name);

        if (existing && existing.length > 0) {
          // Merge: increment quantity of existing part
          const match = existing[0];
          await updatePart(match.id, { quantity: match.quantity + (cap.quantity || 1) });
          mergedCount++;
        } else {
          await addPart({
            name: cap.result.name,
            manufacturer: cap.result.manufacturer,
            mpn: cap.result.mpn,
            category: cap.result.category,
            subcategory: cap.result.subcategory,
            description: null,
            specs: cap.result.estimated_price
              ? { ...(cap.result.specs || {}), estimated_price: cap.result.estimated_price }
              : cap.result.specs,
            quantity: cap.quantity,
            low_stock_threshold: 0,
            image_url: cap.thumbnailUri,
            datasheet_url: null,
            notes: cap.location ? `Location: ${cap.location}` : null,
          });
          newCount++;
        }
      } catch {
        // Continue with others
      }
    }

    setIsSaving(false);
    clearSession();

    const parts: string[] = [];
    if (newCount > 0) parts.push(`${newCount} new`);
    if (mergedCount > 0) parts.push(`${mergedCount} merged with existing`);
    const total = newCount + mergedCount;

    Alert.alert(
      'SAVED',
      `${total} part${total !== 1 ? 's' : ''} processed (${parts.join(', ')}).`,
      [{ text: 'OK', onPress: () => router.replace('/(tabs)/inventory') }]
    );
  }, [confirmedCaptures, addPart, updatePart, clearSession, router]);

  const handleBack = () => {
    const pending = captures.filter((c) => !c.confirmed && !c.discarded).length;
    if (pending > 0) {
      Alert.alert(
        `${pending} unreviewed scans`,
        'Save progress or discard?',
        [
          { text: 'Keep reviewing', style: 'cancel' },
          { text: 'Discard all', style: 'destructive', onPress: () => { clearSession(); router.back(); } },
        ]
      );
    } else {
      router.back();
    }
  };

  if (total === 0) {
    return (
      <ScreenLayout style={{ paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Review" backLabel="Back" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Ionicons name="scan-outline" size={48} color={colors.textDisabled} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textMuted, marginTop: 12 }}>NO SCANS TO REVIEW</Text>
          <Text style={{ fontSize: 14, color: colors.textFaint, marginTop: 4, textAlign: 'center' }}>All captures are still processing or none were taken.</Text>
          <PrimaryButton label="Scan Again" icon="scan-outline" onPress={() => router.replace('/auto-scan')} />
        </View>
      </ScreenLayout>
    );
  }

  if (!current) {
    setCurrentIndex(0);
    return null;
  }

  const confidence = current.result?.confidence ?? 0;
  const lowConfidence = confidence < 0.75;

  // Progress strip
  const progressDots = activeCaptures.map((c) => ({
    color: c.confirmed ? colors.statusOk : c.discarded ? colors.statusOut : c.status === 'failed' ? colors.statusOut : colors.textDisabled,
  }));

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="Review Scans"
        subtitle={`ITEM ${currentIndex + 1} OF ${total}`}
        backLabel="Back"
        onBack={handleBack}
      />

      {/* Progress strip */}
      <View style={s.progressStrip}>
        {progressDots.map((dot, i) => (
          <TouchableOpacity key={i} activeOpacity={0.7} onPress={() => setCurrentIndex(i)}
            style={[s.progressDot, { backgroundColor: dot.color, borderColor: i === currentIndex ? colors.accent : 'transparent' }]} />
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Image */}
        <Image
          source={{ uri: current.thumbnailUri ?? current.imageUri }}
          style={{ height: 220, width: '100%', backgroundColor: colors.bgCard }}
          contentFit="cover"
        />

        {/* Status banner */}
        {current.confirmed && (
          <View style={[s.statusBanner, { backgroundColor: colors.statusOkBg }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.statusOk} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.statusOk }}>CONFIRMED</Text>
          </View>
        )}
        {current.discarded && (
          <View style={[s.statusBanner, { backgroundColor: colors.statusOutBg }]}>
            <Ionicons name="trash" size={18} color={colors.statusOut} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.statusOut }}>DISCARDED</Text>
          </View>
        )}
        {current.status === 'failed' && (
          <View style={[s.statusBanner, { backgroundColor: colors.statusOutBg }]}>
            <Ionicons name="alert-circle" size={18} color={colors.statusOut} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.statusOut }}>SCAN FAILED</Text>
            <Text style={{ fontSize: 14, color: colors.statusOut, marginLeft: 4 }}>{current.error}</Text>
          </View>
        )}

        {/* Confidence badge */}
        {current.result && (
          <View style={[s.confBadge, {
            backgroundColor: lowConfidence ? colors.statusOutBg : colors.statusOkBg,
            borderColor: lowConfidence ? colors.statusOutBorder : colors.statusOkBorder,
          }]}>
            <Ionicons name="sparkles" size={14} color={lowConfidence ? colors.statusOut : colors.statusOk} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: lowConfidence ? colors.statusOut : colors.statusOk }}>
              GEMINI · {Math.round(confidence * 100)}% CONFIDENT
            </Text>
          </View>
        )}

        {/* Editable fields */}
        {current.result && !current.discarded && (
          <View style={{ paddingHorizontal: 12, marginTop: 8 }}>
            <EngravingLabel label="Identified as" />
            <PanelCard>
              <EditField
                label="ITEM NAME" value={current.result.name}
                highlight={lowConfidence}
                onChangeText={(v) => updateCapture(current.id, { result: { ...current.result!, name: v } })}
                colors={colors}
              />
              <EditField
                label="QUANTITY" value={String(current.quantity)} numeric
                onChangeText={(v) => updateCapture(current.id, { quantity: parseInt(v, 10) || 1 })}
                colors={colors}
              />
              <EditField
                label="LOCATION / BIN" value={current.location}
                onChangeText={(v) => updateCapture(current.id, { location: v })}
                colors={colors} placeholder="e.g. Bin A3, Shelf 2"
              />
              <EditField
                label="CATEGORY" value={current.result.category ?? ''}
                onChangeText={(v) => updateCapture(current.id, { result: { ...current.result!, category: v || null } })}
                colors={colors} isLast
              />
            </PanelCard>
          </View>
        )}

        {/* Item actions */}
        {!current.confirmed && !current.discarded && current.status !== 'failed' && (
          <View style={{ paddingHorizontal: 12, marginTop: 8, gap: 4 }}>
            <PrimaryButton label="Confirm" icon="checkmark-circle-outline" onPress={() => confirmCapture(current.id)} />
            <SecondaryButton label="Discard" icon="trash-outline" onPress={() => discardCapture(current.id)} />
          </View>
        )}
      </ScrollView>

      {/* Navigation arrows + batch actions */}
      <View style={[s.bottomBar, { backgroundColor: colors.bgBase, borderTopColor: colors.borderDefault, paddingBottom: insets.bottom + 8 }]}>
        <View style={s.navRow}>
          <TouchableOpacity activeOpacity={0.7} style={s.navBtn} onPress={goPrev} disabled={currentIndex === 0}>
            <Ionicons name="chevron-back" size={24} color={currentIndex === 0 ? colors.textDisabled : colors.textPrimary} />
          </TouchableOpacity>

          <View style={s.batchBtns}>
            {!allReviewed() && (
              <TouchableOpacity activeOpacity={0.75}
                style={[s.batchBtn, { borderColor: colors.accentBorder, backgroundColor: colors.accentBg }]}
                onPress={handleConfirmAll}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accent }}>CONFIRM ALL ≥75%</Text>
              </TouchableOpacity>
            )}

            {allReviewed() && (
              <TouchableOpacity activeOpacity={0.75}
                style={[s.batchBtn, { backgroundColor: colors.accent }]}
                onPress={handleSaveToInventory}
                disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.bgBase} />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.bgBase }}>
                    SAVE {confirmedCaptures().length} TO INVENTORY
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity activeOpacity={0.7} style={s.navBtn} onPress={goNext} disabled={currentIndex === total - 1}>
            <Ionicons name="chevron-forward" size={24} color={currentIndex === total - 1 ? colors.textDisabled : colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </ScreenLayout>
  );
}

function EditField({ label, value, onChangeText, colors, numeric, placeholder, highlight, isLast }: {
  label: string; value: string; onChangeText: (v: string) => void;
  colors: { textMuted: string; textSecondary: string; textDisabled: string; bgDeep: string; borderDefault: string; borderSubtle: string; statusOut: string };
  numeric?: boolean; placeholder?: string; highlight?: boolean; isLast?: boolean;
}) {
  return (
    <View style={[s.editRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }]}>
      <Text style={[s.editLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        style={[s.editInput, {
          color: colors.textSecondary,
          backgroundColor: colors.bgDeep,
          borderColor: highlight ? colors.statusOut : colors.borderDefault,
        }]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textDisabled}
        placeholder={placeholder}
        keyboardType={numeric ? 'number-pad' : 'default'}
      />
    </View>
  );
}

const s = StyleSheet.create({
  progressStrip: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, gap: 3, flexWrap: 'wrap' },
  progressDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  confBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 12, marginTop: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4, borderWidth: 1 },
  editRow: { paddingHorizontal: 12, paddingVertical: 8 },
  editLabel: { fontSize: 14, fontWeight: '700', letterSpacing: 0.05, marginBottom: 4 },
  editInput: { fontSize: 16, fontWeight: '600', borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 8 },
  bottomBar: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 8 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  batchBtns: { flex: 1, gap: 4 },
  batchBtn: { borderRadius: 4, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
});
