import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// Lazy-loaded to avoid native module crash if not in build
let DocumentPicker: typeof import('expo-document-picker') | null = null;
try { DocumentPicker = require('expo-document-picker'); } catch {}

let ExpoFile: typeof import('expo-file-system').File | null = null;
try { ExpoFile = require('expo-file-system').File; } catch {}
import {
  ScreenLayout, ScreenHeader, PanelCard, PrimaryButton, SecondaryButton,
  EngravingLabel, EmptyState,
  Spacing, FontSize, Radius,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import type { NewPart } from '@/lib/types';

interface ParsedItem {
  name: string;
  manufacturer: string | null;
  mpn: string | null;
  category: string | null;
  quantity: number;
  notes: string | null;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsv(content: string): ParsedItem[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase().trim());

  const nameIdx = headers.findIndex((h) => h === 'name' || h === 'part name' || h === 'item');
  const mfgIdx = headers.findIndex((h) => h === 'manufacturer' || h === 'mfg' || h === 'brand');
  const mpnIdx = headers.findIndex((h) => h === 'mpn' || h === 'part number' || h === 'pn');
  const catIdx = headers.findIndex((h) => h === 'category' || h === 'type');
  const qtyIdx = headers.findIndex((h) => h === 'quantity' || h === 'qty' || h === 'count');
  const notesIdx = headers.findIndex((h) => h === 'notes' || h === 'description' || h === 'desc');

  if (nameIdx === -1) {
    // Try to use the first column as name
    return lines.slice(1).map((line) => {
      const fields = parseCsvLine(line);
      return {
        name: fields[0] ?? 'Unknown',
        manufacturer: fields[1] ?? null,
        mpn: fields[2] ?? null,
        category: fields[3] ?? null,
        quantity: parseInt(fields[4] ?? '1', 10) || 1,
        notes: fields[5] ?? null,
      };
    }).filter((item) => item.name && item.name !== 'Unknown');
  }

  return lines.slice(1).map((line) => {
    const fields = parseCsvLine(line);
    const getField = (idx: number): string | null =>
      idx >= 0 && idx < fields.length && fields[idx] ? fields[idx] : null;

    return {
      name: getField(nameIdx) ?? 'Unknown',
      manufacturer: getField(mfgIdx),
      mpn: getField(mpnIdx),
      category: getField(catIdx),
      quantity: parseInt(getField(qtyIdx) ?? '1', 10) || 1,
      notes: getField(notesIdx),
    };
  }).filter((item) => item.name && item.name !== 'Unknown');
}

export default function ImportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { addPart } = useInventoryStore();

  const [items, setItems] = useState<ParsedItem[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ total: number; success: number } | null>(null);

  const handlePickFile = async () => {
    try {
      setParseError(null);
      setItems([]);
      setImportResult(null);

      if (!DocumentPicker) {
        setParseError('Document picker is not available. Please rebuild the app.');
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file) return;

      setFileName(file.name);

      let content: string;
      try {
        if (ExpoFile) {
          const expoFile = new ExpoFile(file.uri);
          content = await expoFile.text();
        } else {
          // Fallback: fetch the file URI
          const resp = await fetch(file.uri);
          content = await resp.text();
        }
      } catch {
        setParseError('Could not read the file. Please make sure it is a valid text/CSV file.');
        return;
      }

      const parsed = parseCsv(content);
      if (parsed.length === 0) {
        setParseError('No valid items found. Make sure the CSV has a header row with at least a "Name" column.');
        return;
      }

      setItems(parsed);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Failed to pick file');
    }
  };

  const handleImport = async () => {
    if (items.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);
    let success = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const newPart: NewPart = {
          name: item.name,
          manufacturer: item.manufacturer,
          mpn: item.mpn,
          category: item.category,
          subcategory: null,
          description: null,
          specs: null,
          quantity: item.quantity,
          low_stock_threshold: 0,
          image_url: null,
          datasheet_url: null,
          notes: item.notes,
        };
        await addPart(newPart);
        success++;
      } catch {
        // Continue with others
      }
      setImportProgress(i + 1);
    }

    setIsImporting(false);
    setImportResult({ total: items.length, success });
  };

  // Success state
  if (importResult) {
    return (
      <ScreenLayout style={{ paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Import Complete" backLabel="Back" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg }}>
          <Ionicons name="checkmark-circle" size={56} color={colors.statusOk} />
          <Text style={{ fontSize: FontSize.lg, fontWeight: '600', color: colors.textPrimary, marginTop: Spacing.sm }}>
            {importResult.success} of {importResult.total} Imported
          </Text>
          {importResult.success < importResult.total && (
            <Text style={{ fontSize: FontSize.sm, color: colors.statusOut, marginTop: Spacing.xs, textAlign: 'center' }}>
              {importResult.total - importResult.success} item{importResult.total - importResult.success !== 1 ? 's' : ''} failed
            </Text>
          )}
          <View style={{ marginTop: Spacing.xl, width: '100%' }}>
            <PrimaryButton label="View Inventory" onPress={() => router.replace('/(tabs)/inventory')} />
            <SecondaryButton label="Import Another" onPress={() => { setImportResult(null); setItems([]); setFileName(null); }} />
          </View>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Import CSV" backLabel="Settings" onBack={() => router.back()} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Pick file */}
        <View style={{ paddingHorizontal: 12, marginTop: Spacing.md }}>
          <PrimaryButton label="Pick CSV File" icon="document-outline" onPress={handlePickFile} disabled={isImporting} />
        </View>

        {fileName && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            marginHorizontal: 12, marginTop: Spacing.sm,
            paddingHorizontal: 12, paddingVertical: 8,
            backgroundColor: colors.accentBg, borderRadius: Radius.card, borderWidth: 1, borderColor: colors.accentBorder,
          }}>
            <Ionicons name="document-text" size={16} color={colors.accent} />
            <Text style={{ fontSize: FontSize.sm, color: colors.accent, flex: 1 }} numberOfLines={1}>{fileName}</Text>
          </View>
        )}

        {/* Parse error */}
        {parseError && (
          <View style={{
            marginHorizontal: 12, marginTop: Spacing.md,
            backgroundColor: colors.statusOutBg, borderRadius: 4, borderWidth: 1,
            borderColor: colors.statusOutBorder, paddingHorizontal: 12, paddingVertical: 10,
          }}>
            <Text style={{ fontSize: FontSize.sm, color: colors.statusOut }}>{parseError}</Text>
          </View>
        )}

        {/* Preview */}
        {items.length > 0 && !isImporting && (
          <>
            <EngravingLabel label={`Preview (${items.length} items)`} />
            <PanelCard>
              {items.slice(0, 50).map((item, i) => (
                <View
                  key={`item-${i}`}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 12, paddingVertical: 10, minHeight: 44,
                    borderBottomWidth: i < Math.min(items.length, 50) - 1 ? 1 : 0,
                    borderBottomColor: colors.borderSubtle,
                  }}
                >
                  <View style={{
                    width: 28, height: 28, borderRadius: Radius.icon,
                    backgroundColor: colors.bgSurface, borderWidth: 0.5, borderColor: colors.borderMid,
                    alignItems: 'center', justifyContent: 'center', marginRight: 10,
                  }}>
                    <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.accent }}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary }} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }} numberOfLines={1}>
                      {[item.manufacturer, item.category, `Qty: ${item.quantity}`].filter(Boolean).join(' \u00B7 ')}
                    </Text>
                  </View>
                </View>
              ))}
              {items.length > 50 && (
                <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textFaint, textAlign: 'center' }}>
                    ...and {items.length - 50} more items
                  </Text>
                </View>
              )}
            </PanelCard>

            <View style={{ paddingHorizontal: 12, marginTop: Spacing.md }}>
              <PrimaryButton
                label={`Import ${items.length} Item${items.length !== 1 ? 's' : ''}`}
                icon="cloud-upload-outline"
                onPress={handleImport}
              />
            </View>
          </>
        )}

        {/* Importing progress */}
        {isImporting && (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={{ fontSize: FontSize.md, color: colors.textPrimary, marginTop: Spacing.md, fontWeight: '600' }}>
              Importing...
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: colors.textMuted, marginTop: Spacing.xs }}>
              {importProgress} of {items.length}
            </Text>
            <View style={{
              width: '60%', height: 4, backgroundColor: colors.bgDeep, borderRadius: 2,
              marginTop: Spacing.md, overflow: 'hidden',
            }}>
              <View style={{
                height: '100%', backgroundColor: colors.accent, borderRadius: 2,
                width: `${items.length > 0 ? Math.round((importProgress / items.length) * 100) : 0}%` as any,
              }} />
            </View>
          </View>
        )}

        {/* Empty state if nothing loaded yet */}
        {items.length === 0 && !parseError && !isImporting && (
          <View style={{ paddingTop: 40 }}>
            <EmptyState
              icon="cloud-upload-outline"
              title="Import parts from a CSV file"
              subtitle="CSV should have headers: Name, Manufacturer, MPN, Category, Quantity, Notes. At minimum, a Name column is required."
            />
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
