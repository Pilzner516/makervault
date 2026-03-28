import {
  View, Text, ScrollView, TouchableOpacity, Alert, Linking,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import {
  ScreenLayout, ScreenHeader, EngravingLabel,
  Spacing, FontSize, Radius,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { ELECTRIC_BLUE } from '@/constants/theme';
import { UniversalQRLabel } from '@/components/QRCodeLabel';
import type { QRLabelType } from '@/components/QRCodeLabel';

type LabelSize = 'small' | 'medium' | 'large';

const SIZE_LABELS: { key: LabelSize; label: string; desc: string }[] = [
  { key: 'small', label: 'Small', desc: 'D30 label (12mm)' },
  { key: 'medium', label: 'Medium', desc: 'Standard label' },
  { key: 'large', label: 'Large', desc: 'Full detail' },
];

export default function QRLabelsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const params = useLocalSearchParams<{
    type: string;
    id: string;
    title: string;
    subtitle?: string;
  }>();

  const type = (params.type ?? 'part') as QRLabelType;
  const id = params.id ?? '';
  const title = params.title ?? 'Unknown';
  const subtitle = params.subtitle;

  const [selectedSize, setSelectedSize] = useState<LabelSize>('medium');
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPhomemo, setHasPhomemo] = useState(false);

  // Ref to the printable label view (white bg, black text — for export)
  const printLabelRef = useRef<View>(null);

  useEffect(() => {
    Linking.canOpenURL('phomemo://').then(setHasPhomemo).catch(() => setHasPhomemo(false));
  }, []);

  // ─── CAPTURE & SHARE ──────────────────────────────────────────────

  const captureAndShare = useCallback(async (dialogTitle: string) => {
    if (!printLabelRef.current) {
      Alert.alert('Not ready', 'Label is still loading.');
      return;
    }
    try {
      const uri = await captureRef(printLabelRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      // expo-sharing handles content:// conversion internally
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle,
      });
    } catch {
      Alert.alert('Export failed', 'Could not share the QR label.');
    }
  }, []);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    await captureAndShare(`QR Label — ${title}`);
    setIsSharing(false);
  }, [captureAndShare, title]);

  const handleSaveToPhotos = useCallback(async () => {
    if (!printLabelRef.current) return;
    setIsSaving(true);
    try {
      const uri = await captureRef(printLabelRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // Try media library
      try {
        const ML = require('expo-media-library');
        const { status } = await ML.requestPermissionsAsync();
        if (status === 'granted') {
          await ML.saveToLibraryAsync(uri);
          Alert.alert('Saved', 'QR label saved to your photo library.');
          return;
        }
      } catch { /* not installed */ }

      // Fallback to share
      await captureAndShare(`Save QR — ${title}`);
    } catch {
      Alert.alert('Save failed', 'Could not save the QR label.');
    } finally {
      setIsSaving(false);
    }
  }, [captureAndShare, title]);

  // Print uses the same share sheet — printers, Phomemo, etc. appear there

  // ─── TYPE DISPLAY ─────────────────────────────────────────────────

  const typeIcon = type === 'location' ? 'location-outline'
    : type === 'category' ? 'grid-outline'
    : 'hardware-chip-outline';

  const typeLabel = type === 'location' ? 'Location'
    : type === 'category' ? 'Category'
    : 'Part';

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="QR Label"
        subtitle={`${typeLabel}: ${title}`}
        backLabel="Back"
        onBack={() => router.back()}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Type badge */}
        <View style={[st.typeBadge, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
          <Ionicons name={typeIcon as keyof typeof Ionicons.glyphMap} size={16} color={colors.accent} />
          <Text style={[st.typeBadgeText, { color: colors.accent }]}>
            {typeLabel.toUpperCase()} QR CODE
          </Text>
        </View>

        {/* Size selector */}
        <EngravingLabel label="Label size" />
        <View style={st.sizeRow}>
          {SIZE_LABELS.map((s) => {
            const active = selectedSize === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                activeOpacity={0.75}
                style={[st.sizeTab, {
                  backgroundColor: active ? colors.accentBg : colors.bgCard,
                  borderColor: active ? colors.accentBorder : colors.borderDefault,
                }]}
                onPress={() => setSelectedSize(s.key)}
              >
                <Text style={[st.sizeTabLabel, { color: active ? colors.accent : colors.textSecondary }]}>{s.label}</Text>
                <Text style={[st.sizeTabDesc, { color: active ? colors.accent : colors.textMuted }]}>{s.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* On-screen preview (themed) */}
        <EngravingLabel label="Preview" />
        <View style={[st.previewWrap, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <UniversalQRLabel type={type} id={id} title={title} subtitle={subtitle} size={selectedSize} />
        </View>

        {/* Hidden printable label — white bg, black text, captured as image */}
        <View style={st.printableContainer}>
          <ViewShot ref={printLabelRef as React.RefObject<ViewShot>} options={{ format: 'png', quality: 1 }}>
            <View style={[st.printLabel, selectedSize === 'small' ? st.printLabelSmall : selectedSize === 'large' ? st.printLabelLarge : st.printLabelMedium]}>
              <View style={st.printQrWrap}>
                <UniversalQRLabel type={type} id={id} title="" size={selectedSize} />
              </View>
              <View style={st.printTextWrap}>
                <Text style={[st.printTitle, selectedSize === 'small' && st.printTitleSmall]}>
                  {title}
                </Text>
                {subtitle && selectedSize !== 'small' && (
                  <Text style={st.printSubtitle} numberOfLines={1}>{subtitle}</Text>
                )}
                {selectedSize === 'large' && (
                  <Text style={st.printHint}>Scan with MakerVault</Text>
                )}
              </View>
            </View>
          </ViewShot>
        </View>

        {/* QR value */}
        <View style={[st.qrValueBox, { backgroundColor: colors.bgDeep, borderColor: colors.borderSubtle }]}>
          <Text style={[st.qrValueLabel, { color: colors.textMuted }]}>QR VALUE</Text>
          <Text style={[st.qrValueText, { color: colors.textFaint }]} selectable>MV:{id}</Text>
        </View>

        {/* Action buttons */}
        <View style={st.actions}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={[st.actionBtn, { backgroundColor: ELECTRIC_BLUE + '15', borderColor: ELECTRIC_BLUE + '40', opacity: isSharing ? 0.5 : 1 }]}
            onPress={handleShare}
            disabled={isSharing}
          >
            {isSharing ? <ActivityIndicator size="small" color={ELECTRIC_BLUE} /> : <Ionicons name="share-outline" size={20} color={ELECTRIC_BLUE} />}
            <Text style={[st.actionBtnText, { color: ELECTRIC_BLUE }]}>{isSharing ? 'SHARING...' : 'SHARE / PRINT'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            style={[st.actionBtn, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder, opacity: isSaving ? 0.5 : 1 }]}
            onPress={handleSaveToPhotos}
            disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name="download-outline" size={20} color={colors.accent} />}
            <Text style={[st.actionBtnText, { color: colors.accent }]}>{isSaving ? 'SAVING...' : 'SAVE TO PHOTOS'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const st = StyleSheet.create({
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    gap: 6, borderWidth: 1, borderRadius: Radius.btn,
    paddingHorizontal: 12, paddingVertical: 6, marginTop: Spacing.md,
  },
  typeBadgeText: { fontSize: FontSize.sm, fontWeight: '700', letterSpacing: 0.05 },
  sizeRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, marginBottom: Spacing.md },
  sizeTab: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: Radius.card, paddingVertical: 10, paddingHorizontal: 4 },
  sizeTabLabel: { fontSize: FontSize.md, fontWeight: '700' },
  sizeTabDesc: { fontSize: 11, marginTop: 2 },
  previewWrap: {
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 12, borderWidth: 1, borderRadius: Radius.card,
    padding: Spacing.lg, minHeight: 160,
  },
  // Hidden off-screen container for the printable label
  printableContainer: {
    position: 'absolute', left: -9999, top: -9999,
  },
  // Print label: white bg, black text, QR on left, text on right
  printLabel: {
    flexDirection: 'row', backgroundColor: '#ffffff',
    alignItems: 'center', padding: 8,
  },
  printLabelSmall: { width: 240, minHeight: 70 },
  printLabelMedium: { width: 380, minHeight: 110 },
  printLabelLarge: { width: 500, minHeight: 160 },
  printQrWrap: { marginRight: 10 },
  printTextWrap: { flex: 1, justifyContent: 'center', flexShrink: 1 },
  printTitle: { fontSize: 16, fontWeight: '700', color: '#000000' },
  printTitleSmall: { fontSize: 11 },
  printSubtitle: { fontSize: 12, color: '#444444', marginTop: 3 },
  printHint: { fontSize: 10, color: '#888888', marginTop: 4 },
  qrValueBox: { marginHorizontal: 12, marginTop: Spacing.sm, borderWidth: 0.5, borderRadius: Radius.btn, paddingHorizontal: 12, paddingVertical: 8 },
  qrValueLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.05, marginBottom: 2 },
  qrValueText: { fontSize: 13, fontFamily: 'monospace' },
  actions: { marginTop: Spacing.lg, paddingHorizontal: 12, gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, borderRadius: Radius.card,
    paddingVertical: 14, paddingHorizontal: 20, minHeight: 48,
  },
  actionBtnText: { fontSize: FontSize.md, fontWeight: '700' },
});
