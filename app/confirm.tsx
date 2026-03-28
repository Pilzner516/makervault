import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ScreenLayout, ScreenHeader,
  EngravingLabel, PrimaryButton, SecondaryButton,
  Badge, EmptyState, PanelCard,
  Spacing, FontSize, Radius,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { ELECTRIC_BLUE } from '@/constants/theme';
import { identifyPart, identifyBulkParts, generateJSON, fetchProductImageUrl } from '@/lib/gemini';
import { preprocessImage, simpleHash, createThumbnailDataUri } from '@/lib/image';
import { getCategoryColor } from '@/lib/categoryColors';
import { supabase } from '@/lib/supabase';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import { useSettingsStore } from '@/lib/zustand/settingsStore';
import type { GeminiIdentification, ConfirmationFeedback } from '@/lib/types';

type BulkDecision = 'pending' | 'add' | 'skip';

export default function ConfirmScreen() {
  const { imageUri, bulkMode, barcodeData, barcodeType } = useLocalSearchParams<{
    imageUri: string;
    bulkMode: string;
    barcodeData: string;
    barcodeType: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { addPart, updatePart } = useInventoryStore();
  const scanPreset = useSettingsStore((s) => s.getScanPreset());

  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeminiIdentification | null>(null);
  const [bulkResults, setBulkResults] = useState<GeminiIdentification[]>([]);
  const [bulkDecisions, setBulkDecisions] = useState<BulkDecision[]>([]);
  const [altIndex, setAltIndex] = useState(-1);
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [imageHash, setImageHash] = useState('');

  const isBulk = bulkMode === '1';
  const isBarcodeMode = !!barcodeData;

  useEffect(() => {
    // Barcode-based identification — no image needed
    if (barcodeData) {
      (async () => {
        try {
          setImageHash(simpleHash(barcodeData));
          const identification = await generateJSON<GeminiIdentification>(
            `You are an expert maker/workshop inventory identifier.
Identify this product by its barcode number: ${barcodeData} (type: ${barcodeType ?? 'unknown'}).

CATEGORY RULES — assign one of: Electronics, Robotics, Fasteners, Tools, 3D Printing, Materials, Mechanical, Safety & PPE.

Rules for part_name:
- Write it like an Amazon product listing title
- Start with WHAT IT IS, not model numbers
- Include purpose, type, size/length, brand if known

Return JSON:
{
  "part_name": string,
  "manufacturer": string,
  "mpn": string,
  "category": string,
  "subcategory": string,
  "specs": object,
  "markings_detected": string[],
  "confidence": number,
  "estimated_price": string,
  "alternatives": [
    { "part_name": string, "mpn": string, "confidence": number }
  ]
}

If the barcode is not recognized, set part_name to your best guess and confidence below 0.3.`
          );
          setResult(identification);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to identify barcode');
        } finally {
          setIsAnalyzing(false);
        }
      })();
      return;
    }

    if (!imageUri) return;

    (async () => {
      try {
        const { base64, uri, mimeType } = await preprocessImage(imageUri, {
          width: scanPreset.imageWidth,
          quality: scanPreset.jpegQuality,
        });
        setProcessedUri(uri);
        setBase64Data(base64);
        setImageHash(simpleHash(base64.slice(0, 200)));

        // Generate a small thumbnail for DB storage
        try {
          // Use the ORIGINAL camera image for the thumbnail, not the compressed scan image
          const thumb = await createThumbnailDataUri(imageUri);
          setThumbnailUri(thumb);
        } catch {
          // Continue without thumbnail
        }

        if (isBulk) {
          const results = await identifyBulkParts(base64, mimeType);
          setBulkResults(results);
          setBulkDecisions(results.map(() => 'pending'));
        } else {
          const identification = await identifyPart(base64, mimeType);
          setResult(identification);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to analyze image');
      } finally {
        setIsAnalyzing(false);
      }
    })();
  }, [imageUri, isBulk, barcodeData, barcodeType]);

  const displayedResult =
    altIndex >= 0 && result?.alternatives[altIndex]
      ? {
          ...result,
          part_name: result.alternatives[altIndex].part_name,
          mpn: result.alternatives[altIndex].mpn,
          confidence: result.alternatives[altIndex].confidence,
        }
      : result;

  const logFeedback = async (
    action: ConfirmationFeedback['action'],
    finalMpn: string
  ) => {
    const feedback: ConfirmationFeedback = {
      image_hash: imageHash,
      gemini_suggestion: result?.mpn ?? '',
      action,
      final_mpn: finalMpn,
    };
    supabase.from('identification_feedback').insert(feedback).then();
  };

  const saveOnePart = async (identification: GeminiIdentification): Promise<void> => {
    // Check for existing part with same name (case-insensitive)
    const { data: existing } = await supabase
      .from('parts')
      .select('id, name, quantity')
      .ilike('name', identification.part_name);

    if (existing && existing.length > 0) {
      const match = existing[0];
      return new Promise<void>((resolve, reject) => {
        Alert.alert(
          'Duplicate Found',
          `"${match.name}" already exists with quantity ${match.quantity}. Add to existing or create new?`,
          [
            {
              text: `Add to existing (qty: ${match.quantity} \u2192 ${match.quantity + 1})`,
              onPress: async () => {
                try {
                  await updatePart(match.id, { quantity: match.quantity + 1 });
                  resolve();
                } catch (e) {
                  reject(e);
                }
              },
            },
            {
              text: 'Add as new',
              onPress: async () => {
                try {
                  await addNewPart(identification);
                  resolve();
                } catch (e) {
                  reject(e);
                }
              },
            },
            { text: 'Cancel', style: 'cancel', onPress: () => reject(new Error('Cancelled')) },
          ]
        );
      });
    }

    await addNewPart(identification);
  };

  const addNewPart = async (identification: GeminiIdentification) => {
    const imageUrl: string | null = thumbnailUri;
    const specs = { ...(identification.specs || {}) };
    if (identification.estimated_price) {
      specs.estimated_price = identification.estimated_price;
    }

    // Fetch product image URL in background (don't block save)
    const productImagePromise = fetchProductImageUrl(
      identification.part_name,
      identification.mpn || null,
    ).catch(() => '');

    // Try to get the image before saving, but don't wait more than 3s
    const productImg = await Promise.race([
      productImagePromise,
      new Promise<string>((r) => setTimeout(() => r(''), 3000)),
    ]);
    if (productImg) {
      specs.product_image_url = productImg;
    }

    await addPart({
      name: identification.part_name,
      manufacturer: identification.manufacturer || null,
      mpn: identification.mpn || null,
      category: identification.category || null,
      subcategory: identification.subcategory || null,
      description: null,
      specs: Object.keys(specs).length > 0 ? specs : null,
      quantity: 1,
      low_stock_threshold: 0,
      image_url: imageUrl,
      datasheet_url: null,
      notes: identification.markings_detected.length > 0
        ? `Markings: ${identification.markings_detected.join(', ')}`
        : null,
    });
  };

  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isSavingSingle, setIsSavingSingle] = useState(false);

  // Single-part confirm — disable button immediately to prevent double-tap
  const handleConfirm = async (identification: GeminiIdentification) => {
    if (isSavingSingle) return;
    setIsSavingSingle(true);
    try {
      await saveOnePart(identification);
      logFeedback(altIndex >= 0 ? 'chose_alternative' : 'confirmed', identification.mpn);
      setSaved(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      if (msg === 'Cancelled') { setIsSavingSingle(false); return; }
      console.error('Save failed:', msg);
      setSaveError(msg);
    } finally {
      setIsSavingSingle(false);
    }
  };

  // Bulk: mark one item as add or skip
  const setBulkDecision = (index: number, decision: BulkDecision) => {
    setBulkDecisions((prev) => prev.map((d, i) => (i === index ? decision : d)));
  };

  const [bulkSavedCount, setBulkSavedCount] = useState<number | null>(null);

  // Bulk: save all items marked "add"
  const handleBulkConfirm = async () => {
    setIsSaving(true);
    let added = 0;
    for (let i = 0; i < bulkResults.length; i++) {
      if (bulkDecisions[i] === 'add') {
        try {
          await saveOnePart(bulkResults[i]);
          added++;
        } catch {
          // Continue with remaining items
        }
      }
    }
    setIsSaving(false);
    setBulkSavedCount(added);
  };

  const handleReject = () => {
    logFeedback('rejected', '');
    router.back();
  };

  // -- SAVED STATE --
  if (saved) {
    return (
      <ScreenLayout style={{ paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Saved!" backLabel="Scan" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg }}>
          <Ionicons name="checkmark-circle" size={56} color={colors.statusOk} />
          <Text style={{ fontSize: FontSize.lg, fontWeight: '600', color: colors.textPrimary, marginTop: Spacing.sm }}>
            Added to Inventory
          </Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textMuted, textAlign: 'center', marginTop: Spacing.xs }}>
            {displayedResult?.part_name ?? 'Part'} saved successfully
          </Text>
          <View style={{ marginTop: Spacing.xl, width: '100%' }}>
            <PrimaryButton label="Scan Another" onPress={() => router.back()} />
            <SecondaryButton label="View Inventory" onPress={() => router.replace('/(tabs)/inventory')} />
          </View>
        </View>
      </ScreenLayout>
    );
  }

  // -- SAVE ERROR STATE --
  if (saveError) {
    return (
      <ScreenLayout style={{ paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Error" backLabel="Back" onBack={() => router.back()} />
        <EmptyState
          icon="alert-circle-outline"
          title="Failed to save"
          subtitle={saveError}
          actionLabel="Try Again"
          onAction={() => setSaveError(null)}
        />
      </ScreenLayout>
    );
  }

  // -- LOADING STATE --
  if (isAnalyzing) {
    return (
      <ScreenLayout style={{ paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Analyzing..." backLabel="Cancel" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg }}>
          {isBarcodeMode ? (
            <View style={{
              alignItems: 'center', justifyContent: 'center',
              height: 180, width: 180, borderRadius: Radius.card, marginBottom: 20,
              backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.borderDefault,
            }}>
              <Ionicons name="barcode-outline" size={48} color={colors.accent} />
              <Text style={{ fontSize: FontSize.sm, color: colors.textMuted, marginTop: Spacing.sm, textAlign: 'center' }}>
                {barcodeData}
              </Text>
              {barcodeType && (
                <Text style={{ fontSize: FontSize.xs, color: colors.textFaint, marginTop: 2 }}>
                  Type: {barcodeType}
                </Text>
              )}
            </View>
          ) : processedUri ? (
            <Image
              source={{ uri: processedUri }}
              style={{ height: 180, width: 180, borderRadius: Radius.card, marginBottom: 20 }}
              contentFit="cover"
            />
          ) : null}
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ fontSize: FontSize.md, color: colors.textMuted, marginTop: Spacing.lg }}>
            {isBarcodeMode ? 'Looking up barcode...' : isBulk ? 'Identifying all parts...' : 'Identifying component...'}
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  // -- ERROR STATE --
  if (error) {
    return (
      <ScreenLayout style={{ paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Error" backLabel="Back" onBack={() => router.back()} />
        <EmptyState
          icon="alert-circle-outline"
          title={error}
          actionLabel="Try Again"
          onAction={() => router.back()}
        />
      </ScreenLayout>
    );
  }

  // -- BULK SAVED --
  if (bulkSavedCount !== null) {
    return (
      <ScreenLayout style={{ paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Done!" backLabel="Scan" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg }}>
          <Ionicons name="checkmark-circle" size={56} color={colors.statusOk} />
          <Text style={{ fontSize: FontSize.lg, fontWeight: '600', color: colors.textPrimary, marginTop: Spacing.sm }}>
            {bulkSavedCount} Part{bulkSavedCount !== 1 ? 's' : ''} Added
          </Text>
          <View style={{ marginTop: Spacing.xl, width: '100%' }}>
            <PrimaryButton label="Scan More" onPress={() => router.back()} />
            <SecondaryButton label="View Inventory" onPress={() => router.replace('/(tabs)/inventory')} />
          </View>
        </View>
      </ScreenLayout>
    );
  }

  // -- BULK RESULTS --
  if (isBulk && bulkResults.length > 0) {
    const pendingCount = bulkDecisions.filter((d) => d === 'pending').length;
    const addCount = bulkDecisions.filter((d) => d === 'add').length;

    return (
      <ScreenLayout style={{ paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader
          title={`${bulkResults.length} Parts Found`}
          backLabel="Cancel"
          onBack={() => router.back()}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        >
          {/* Source image */}
          {processedUri && (
            <Image
              source={{ uri: processedUri }}
              style={{ height: 160, width: '100%', backgroundColor: colors.bgCard }}
              contentFit="cover"
            />
          )}

          <EngravingLabel label="Review each item" />

          {bulkResults.map((item, i) => {
            const decision = bulkDecisions[i];
            const isDecided = decision !== 'pending';
            return (
              <View
                key={`bulk-${i}`}
                style={{
                  marginHorizontal: Spacing.md,
                  marginBottom: 7,
                  borderRadius: Radius.card,
                  padding: Spacing.md,
                  borderWidth: 0.5,
                  backgroundColor: isDecided ? colors.bgSurface : colors.bgCard,
                  borderColor: decision === 'add' ? colors.statusOk : decision === 'skip' ? colors.borderMid : colors.borderDefault,
                  opacity: decision === 'skip' ? 0.5 : 1,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  {/* Item number */}
                  <View style={{
                    width: 32, height: 32, borderRadius: Radius.icon,
                    backgroundColor: colors.bgSurface, borderWidth: 0.5, borderColor: colors.borderMid,
                    alignItems: 'center', justifyContent: 'center', marginRight: 10,
                  }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.accent }}>{i + 1}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '500', color: colors.textSecondary }}>{item.part_name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                      {item.category && (() => {
                        const cc = getCategoryColor(item.category);
                        return (
                          <View style={{ backgroundColor: cc + '18', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 0.5, borderColor: cc + '40' }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: cc }}>{item.category}</Text>
                          </View>
                        );
                      })()}
                      {item.manufacturer && item.manufacturer.toLowerCase() !== 'n/a' && (
                        <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>{item.manufacturer}</Text>
                      )}
                      {item.estimated_price ? (
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.statusOk }}>{item.estimated_price}</Text>
                      ) : null}
                    </View>
                    {item.specs && Object.keys(item.specs).length > 0 && (
                      <Text style={{ fontSize: FontSize.xs, color: colors.textFaint, marginTop: 3 }} numberOfLines={1}>
                        {Object.entries(item.specs).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' \u00B7 ')}
                      </Text>
                    )}
                  </View>

                  <ConfidenceBadge confidence={item.confidence} />
                </View>

                {/* Add / Skip buttons */}
                {!isDecided && (
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                        borderRadius: Radius.icon, paddingVertical: 8, backgroundColor: colors.statusOkBg,
                        borderWidth: 0.5, borderColor: colors.statusOkBorder, gap: 4,
                      }}
                      onPress={() => setBulkDecision(i, 'add')}
                    >
                      <Ionicons name="add" size={16} color={colors.statusOk} />
                      <Text style={{ fontSize: FontSize.xs, fontWeight: '500', color: colors.statusOk }}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                        borderRadius: Radius.icon, paddingVertical: 8, backgroundColor: colors.bgSurface,
                        borderWidth: 0.5, borderColor: colors.borderDefault, gap: 4,
                      }}
                      onPress={() => setBulkDecision(i, 'skip')}
                    >
                      <Ionicons name="close" size={16} color={colors.textFaint} />
                      <Text style={{ fontSize: FontSize.xs, fontWeight: '500', color: colors.textFaint }}>Skip</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Decision badge */}
                {isDecided && (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}
                    onPress={() => setBulkDecision(i, 'pending')}
                  >
                    <Ionicons
                      name={decision === 'add' ? 'checkmark-circle' : 'close-circle'}
                      size={14}
                      color={decision === 'add' ? colors.statusOk : colors.textFaint}
                    />
                    <Text style={{ fontSize: FontSize.xs, color: decision === 'add' ? colors.statusOk : colors.textFaint }}>
                      {decision === 'add' ? 'Will add' : 'Skipped'} \u00B7 tap to change
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Bottom confirm bar */}
        <View style={{
          paddingHorizontal: Spacing.md, paddingTop: 10, paddingBottom: insets.bottom + 8,
          backgroundColor: colors.bgBase, borderTopWidth: 0.5, borderTopColor: colors.borderSubtle,
        }}>
          {pendingCount > 0 && (
            <Text style={{ fontSize: FontSize.xs, color: colors.textFaint, textAlign: 'center', marginBottom: 6 }}>
              {pendingCount} item{pendingCount !== 1 ? 's' : ''} still need a decision
            </Text>
          )}
          <TouchableOpacity
            activeOpacity={0.75}
            style={{
              borderRadius: Radius.icon, paddingVertical: 11, alignItems: 'center', borderWidth: 0.5,
              backgroundColor: addCount > 0 ? colors.accentBg : colors.bgSurface,
              borderColor: addCount > 0 ? colors.accentBorder : colors.borderDefault,
              opacity: isSaving ? 0.5 : 1,
            }}
            onPress={handleBulkConfirm}
            disabled={addCount === 0 || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={{
                fontSize: FontSize.sm, fontWeight: '500',
                color: addCount > 0 ? colors.accent : colors.textFaint,
              }}>
                {addCount > 0 ? `Add ${addCount} Part${addCount !== 1 ? 's' : ''} to Inventory` : 'Select items to add'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  // -- SINGLE RESULT --
  if (!displayedResult) return null;

  const lowConfidence = displayedResult.confidence < 0.6;

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Confirm Part" backLabel="Cancel" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Photo or Barcode info */}
        {isBarcodeMode ? (
          <View style={{
            height: 120, alignItems: 'center', justifyContent: 'center',
            backgroundColor: colors.bgCard, borderBottomWidth: 0.5, borderBottomColor: colors.borderDefault,
            gap: 6,
          }}>
            <Ionicons name="barcode-outline" size={36} color={colors.accent} />
            <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.textPrimary }}>
              {barcodeData}
            </Text>
            {barcodeType && (
              <Text style={{ fontSize: FontSize.xs, color: colors.textFaint }}>
                {barcodeType.toUpperCase()}
              </Text>
            )}
          </View>
        ) : processedUri ? (
          <Image
            source={{ uri: processedUri }}
            style={{ height: 200, width: '100%', backgroundColor: colors.bgCard }}
            contentFit="cover"
          />
        ) : null}

        {/* AI match card */}
        <View style={{
          backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.borderDefault,
          borderRadius: Radius.card, marginHorizontal: Spacing.md, marginTop: Spacing.sm, padding: Spacing.md,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.textPrimary }}>
                {displayedResult.part_name}
              </Text>
              {displayedResult.manufacturer && (
                <Text style={{ fontSize: FontSize.sm, color: colors.textMuted, marginTop: 2 }}>
                  {displayedResult.manufacturer}
                </Text>
              )}
              {displayedResult.mpn && (
                <Text style={{ fontSize: FontSize.xs, color: colors.accent, marginTop: 2 }}>
                  MPN: {displayedResult.mpn}
                </Text>
              )}
            </View>
            <ConfidenceBadge confidence={displayedResult.confidence} />
          </View>

          {/* Category + Price row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, gap: 6, flexWrap: 'wrap' }}>
            {displayedResult.category && (() => {
              const catColor = getCategoryColor(displayedResult.category);
              return (
                <View style={{
                  backgroundColor: catColor + '18', borderRadius: Radius.badge,
                  borderWidth: 0.5, borderColor: catColor + '40',
                  paddingHorizontal: 8, paddingVertical: 3,
                }}>
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: catColor }}>
                    {displayedResult.category}{displayedResult.subcategory ? ` · ${displayedResult.subcategory}` : ''}
                  </Text>
                </View>
              );
            })()}
            {displayedResult.estimated_price ? (
              <View style={{
                backgroundColor: colors.statusOkBg, borderRadius: Radius.badge,
                borderWidth: 0.5, borderColor: colors.statusOkBorder,
                paddingHorizontal: 8, paddingVertical: 3,
              }}>
                <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.statusOk }}>
                  {displayedResult.estimated_price}
                </Text>
              </View>
            ) : (
              <View style={{
                backgroundColor: colors.bgSurface, borderRadius: Radius.badge,
                borderWidth: 0.5, borderColor: colors.borderDefault,
                paddingHorizontal: 8, paddingVertical: 3,
              }}>
                <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.textMuted }}>
                  Verify Price
                </Text>
              </View>
            )}
          </View>

          {displayedResult.specs && Object.keys(displayedResult.specs).length > 0 && (
            <View style={{ marginTop: Spacing.sm, borderTopWidth: 0.5, borderTopColor: colors.borderDefault, paddingTop: 8 }}>
              {Object.entries(displayedResult.specs).map(([k, v]) => (
                <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textFaint, textTransform: 'capitalize' }}>{k}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>{v}</Text>
                </View>
              ))}
            </View>
          )}

          {displayedResult.markings_detected.length > 0 && (
            <Text style={{ fontSize: FontSize.xs, color: colors.textFaint, marginTop: Spacing.sm }}>
              Markings: {displayedResult.markings_detected.join(', ')}
            </Text>
          )}
        </View>

        {/* Low confidence warning */}
        {lowConfidence && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.md, marginTop: Spacing.sm,
            backgroundColor: colors.alertWarnBg, borderRadius: Radius.icon,
            paddingVertical: 6, paddingHorizontal: 10, gap: 4,
          }}>
            <Ionicons name="warning" size={14} color={colors.accent} />
            <Text style={{ fontSize: FontSize.xs, color: colors.accent }}>
              Low confidence \u2014 verify before confirming
            </Text>
          </View>
        )}

        {/* Alternatives */}
        {result && result.alternatives.length > 0 && (
          <View style={{ marginHorizontal: Spacing.md, marginTop: Spacing.sm }}>
            <EngravingLabel label="Other matches" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <AltPill
                  label={result.part_name}
                  pct={Math.round(result.confidence * 100)}
                  active={altIndex === -1}
                  onPress={() => setAltIndex(-1)}
                />
                {result.alternatives.map((alt, i) => (
                  <AltPill
                    key={`alt-${i}`}
                    label={alt.part_name}
                    pct={Math.round(alt.confidence * 100)}
                    active={altIndex === i}
                    onPress={() => setAltIndex(i)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Action buttons */}
        <View style={{ marginTop: Spacing.lg }}>
          {/* Primary: Save to Inventory — prominent, accent colored */}
          <PrimaryButton
            label={isSavingSingle ? "SAVING..." : "ADD TO INVENTORY"}
            icon="add-circle-outline"
            disabled={isSavingSingle}
            onPress={() => handleConfirm(displayedResult)}
          />

          {/* Price Check — does NOT save, just searches suppliers */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              marginHorizontal: Spacing.md, marginVertical: 4, borderRadius: Radius.icon,
              paddingVertical: 11, gap: 6,
              backgroundColor: ELECTRIC_BLUE + '15', borderWidth: 1, borderColor: ELECTRIC_BLUE + '40',
            }}
            onPress={() => {
              const junk = ['n/a', 'generic', 'unknown', 'not specified', ''];
              const clean = (s: string | null | undefined) => s && !junk.includes(s.toLowerCase().trim()) ? s.trim() : null;
              const name = displayedResult.part_name.split(/[\s,]+/).slice(0, 6).join(' ');
              const mpn = clean(displayedResult.mpn);
              const mfg = clean(displayedResult.manufacturer);
              const q = [name, mpn, mfg].filter(Boolean).join(' ');
              router.push({ pathname: '/where-to-buy' as any, params: { itemName: q } });
            }}
          >
            <Ionicons name="pricetag-outline" size={16} color={ELECTRIC_BLUE} />
            <Text numberOfLines={1} style={{ fontSize: FontSize.sm, fontWeight: '600', color: ELECTRIC_BLUE }}>
              PRICE CHECK (DON'T SAVE)
            </Text>
          </TouchableOpacity>

          <SecondaryButton
            label="Edit Manually"
            icon="pencil-outline"
            onPress={() => { logFeedback('edited', ''); router.back(); }}
          />

          <TouchableOpacity
            activeOpacity={0.75}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              paddingVertical: 10, marginHorizontal: Spacing.md, marginVertical: 4, gap: 4,
            }}
            onPress={handleReject}
          >
            <Ionicons name="close" size={16} color={colors.statusOut} />
            <Text numberOfLines={1} style={{ fontSize: FontSize.sm, color: colors.statusOut }}>Not a Match</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const { colors } = useTheme();
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? colors.statusOk : pct >= 60 ? colors.accent : colors.statusOut;
  const bg = pct >= 80 ? colors.statusOkBg : pct >= 60 ? colors.statusLowBg : colors.statusOutBg;

  return (
    <View style={{ backgroundColor: bg, borderRadius: Radius.badge, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color }}>{pct}%</Text>
    </View>
  );
}

function AltPill({ label, pct, active, onPress }: { label: string; pct: number; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={{
        borderRadius: Radius.icon, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 0.5,
        backgroundColor: active ? colors.accentBg : colors.bgCard,
        borderColor: active ? colors.accentBorder : colors.borderDefault,
      }}
      onPress={onPress}
    >
      <Text style={{ fontSize: FontSize.xs, fontWeight: '500', color: active ? colors.accent : colors.textSecondary }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ fontSize: FontSize.xs, color: active ? colors.accent : colors.textMuted }}>{pct}%</Text>
    </TouchableOpacity>
  );
}
