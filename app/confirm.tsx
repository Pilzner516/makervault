import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { identifyPart, identifyBulkParts } from '@/lib/gemini';
import { preprocessImage, simpleHash } from '@/lib/image';
import { supabase } from '@/lib/supabase';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import type { GeminiIdentification, ConfirmationFeedback } from '@/lib/types';

export default function ConfirmScreen() {
  const { imageUri, bulkMode } = useLocalSearchParams<{
    imageUri: string;
    bulkMode: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addPart } = useInventoryStore();

  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeminiIdentification | null>(null);
  const [bulkResults, setBulkResults] = useState<GeminiIdentification[]>([]);
  const [altIndex, setAltIndex] = useState(-1); // -1 = primary, 0+ = alternative index
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [imageHash, setImageHash] = useState('');

  const isBulk = bulkMode === '1';

  useEffect(() => {
    if (!imageUri) return;

    (async () => {
      try {
        const { base64, uri, mimeType } = await preprocessImage(imageUri);
        setProcessedUri(uri);
        setImageHash(simpleHash(base64.slice(0, 200)));

        if (isBulk) {
          const results = await identifyBulkParts(base64, mimeType);
          setBulkResults(results);
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
  }, [imageUri, isBulk]);

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
    // Fire-and-forget logging
    supabase.from('identification_feedback').insert(feedback).then();
  };

  const handleConfirm = async (identification: GeminiIdentification) => {
    try {
      // Upload image to Supabase Storage
      let imageUrl: string | null = null;
      if (processedUri) {
        const fileName = `parts/${Date.now()}.jpg`;
        const response = await fetch(processedUri);
        const blob = await response.blob();
        const { data } = await supabase.storage
          .from('part-images')
          .upload(fileName, blob, { contentType: 'image/jpeg' });
        if (data) {
          const { data: urlData } = supabase.storage
            .from('part-images')
            .getPublicUrl(data.path);
          imageUrl = urlData.publicUrl;
        }
      }

      await addPart({
        name: identification.part_name,
        manufacturer: identification.manufacturer || null,
        mpn: identification.mpn || null,
        category: identification.category || null,
        subcategory: identification.subcategory || null,
        description: null,
        specs: identification.specs || null,
        quantity: 1,
        low_stock_threshold: 5,
        image_url: imageUrl,
        datasheet_url: null,
        notes: identification.markings_detected.length > 0
          ? `Markings: ${identification.markings_detected.join(', ')}`
          : null,
      });

      logFeedback(
        altIndex >= 0 ? 'chose_alternative' : 'confirmed',
        identification.mpn
      );

      Alert.alert('Added!', `${identification.part_name} saved to inventory.`, [
        { text: 'Scan Another', onPress: () => router.back() },
        {
          text: 'View Inventory',
          onPress: () => router.replace('/(tabs)/inventory'),
        },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save part.');
    }
  };

  const handleReject = () => {
    logFeedback('rejected', '');
    router.back();
  };

  // Loading state
  if (isAnalyzing) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Stack.Screen options={{ title: 'Analyzing...' }} />
        {processedUri && (
          <Image
            source={{ uri: processedUri }}
            className="mb-6 h-48 w-48 rounded-2xl"
            contentFit="cover"
          />
        )}
        <ActivityIndicator size="large" color="#0a7ea4" />
        <Text className="mt-4 text-base text-zinc-500">
          {isBulk ? 'Identifying all parts...' : 'Identifying component...'}
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 px-8 dark:bg-zinc-950">
        <Stack.Screen options={{ title: 'Error' }} />
        <MaterialIcons name="error-outline" size={48} color="#ef4444" />
        <Text className="mt-3 text-center text-base text-zinc-700 dark:text-zinc-300">
          {error}
        </Text>
        <Pressable
          className="mt-5 rounded-xl bg-primary px-6 py-3"
          onPress={() => router.back()}
        >
          <Text className="font-semibold text-white">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // Bulk results
  if (isBulk && bulkResults.length > 0) {
    return (
      <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
        <Stack.Screen options={{ title: `${bulkResults.length} Parts Found` }} />
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {processedUri && (
            <Image
              source={{ uri: processedUri }}
              className="mb-4 h-48 w-full rounded-2xl"
              contentFit="cover"
            />
          )}
          {bulkResults.map((item, i) => (
            <View
              key={`${item.mpn}-${i}`}
              className="mb-3 rounded-xl bg-white p-4 dark:bg-zinc-800"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {item.part_name}
                  </Text>
                  {item.manufacturer && (
                    <Text className="text-sm text-zinc-500">
                      {item.manufacturer}
                      {item.mpn ? ` — ${item.mpn}` : ''}
                    </Text>
                  )}
                  {item.category && (
                    <View className="mt-1 self-start rounded-full bg-primary/10 px-2.5 py-0.5">
                      <Text className="text-xs text-primary">{item.category}</Text>
                    </View>
                  )}
                </View>
                <ConfidenceBadge confidence={item.confidence} />
              </View>
              <View className="mt-3 flex-row gap-2">
                <Pressable
                  className="flex-1 items-center rounded-lg bg-primary py-2.5"
                  onPress={() => handleConfirm(item)}
                >
                  <Text className="text-sm font-medium text-white">Add</Text>
                </Pressable>
                <Pressable
                  className="rounded-lg bg-zinc-200 px-4 py-2.5 dark:bg-zinc-700"
                  onPress={() => {
                    setBulkResults(bulkResults.filter((_, idx) => idx !== i));
                  }}
                >
                  <MaterialIcons name="close" size={18} color="#71717a" />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Single result — side-by-side confirmation
  if (!displayedResult) return null;

  const lowConfidence = displayedResult.confidence < 0.6;

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <Stack.Screen options={{ title: 'Confirm Part' }} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Side-by-side panels */}
        <View className="flex-row px-4 pt-4">
          {/* Left: user capture */}
          <View className="mr-1.5 flex-1 rounded-xl bg-white p-3 dark:bg-zinc-800">
            <Text className="mb-2 text-xs font-medium uppercase text-zinc-400">
              Your Photo
            </Text>
            {processedUri && (
              <Image
                source={{ uri: processedUri }}
                className="h-40 w-full rounded-lg"
                contentFit="cover"
              />
            )}
            {displayedResult.markings_detected.length > 0 && (
              <View className="mt-2">
                <Text className="text-xs text-zinc-500">Markings detected:</Text>
                <Text className="mt-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {displayedResult.markings_detected.join(', ')}
                </Text>
              </View>
            )}
          </View>

          {/* Right: AI match */}
          <View className="ml-1.5 flex-1 rounded-xl bg-white p-3 dark:bg-zinc-800">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xs font-medium uppercase text-zinc-400">
                AI Match
              </Text>
              <ConfidenceBadge confidence={displayedResult.confidence} />
            </View>
            <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {displayedResult.part_name}
            </Text>
            {displayedResult.manufacturer && (
              <Text className="mt-0.5 text-sm text-zinc-500">
                {displayedResult.manufacturer}
              </Text>
            )}
            {displayedResult.mpn && (
              <Text className="mt-0.5 text-sm font-mono text-zinc-600 dark:text-zinc-400">
                MPN: {displayedResult.mpn}
              </Text>
            )}
            {displayedResult.category && (
              <View className="mt-2 self-start rounded-full bg-primary/10 px-2.5 py-0.5">
                <Text className="text-xs text-primary">
                  {displayedResult.category}
                </Text>
              </View>
            )}
            {displayedResult.specs &&
              Object.keys(displayedResult.specs).length > 0 && (
                <View className="mt-2">
                  <Text className="text-xs text-zinc-500">Key Specs:</Text>
                  {Object.entries(displayedResult.specs).map(([k, v]) => (
                    <Text
                      key={k}
                      className="text-xs text-zinc-700 dark:text-zinc-300"
                    >
                      {k}: {v}
                    </Text>
                  ))}
                </View>
              )}
          </View>
        </View>

        {/* Low confidence warning */}
        {lowConfidence && (
          <View className="mx-4 mt-3 flex-row items-center rounded-lg bg-warning/10 px-3 py-2.5">
            <MaterialIcons name="warning" size={18} color="#f59e0b" />
            <Text className="ml-2 flex-1 text-sm text-warning">
              Low confidence — please verify before confirming
            </Text>
          </View>
        )}

        {/* Alternatives carousel */}
        {result && result.alternatives.length > 0 && (
          <View className="mx-4 mt-3">
            <Text className="mb-2 text-sm font-medium text-zinc-500">
              Other Possible Matches
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {/* Primary match */}
                <Pressable
                  className={`rounded-lg px-3 py-2 ${
                    altIndex === -1 ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-800'
                  }`}
                  onPress={() => setAltIndex(-1)}
                >
                  <Text
                    className={`text-sm font-medium ${
                      altIndex === -1 ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {result.part_name}
                  </Text>
                  <Text
                    className={`text-xs ${
                      altIndex === -1 ? 'text-white/70' : 'text-zinc-500'
                    }`}
                  >
                    {Math.round(result.confidence * 100)}%
                  </Text>
                </Pressable>
                {result.alternatives.map((alt, i) => (
                  <Pressable
                    key={`alt-${i}`}
                    className={`rounded-lg px-3 py-2 ${
                      altIndex === i ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-800'
                    }`}
                    onPress={() => setAltIndex(i)}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        altIndex === i ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {alt.part_name}
                    </Text>
                    <Text
                      className={`text-xs ${
                        altIndex === i ? 'text-white/70' : 'text-zinc-500'
                      }`}
                    >
                      {Math.round(alt.confidence * 100)}%
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Action buttons */}
        <View className="mx-4 mt-5 gap-3">
          <Pressable
            className="flex-row items-center justify-center rounded-xl bg-primary py-4 active:bg-primary/80"
            onPress={() => handleConfirm(displayedResult)}
          >
            <MaterialIcons name="check-circle" size={20} color="#fff" />
            <Text className="ml-2 text-base font-semibold text-white">
              Confirm & Save
            </Text>
          </Pressable>

          <Pressable
            className="flex-row items-center justify-center rounded-xl bg-zinc-200 py-3.5 dark:bg-zinc-800"
            onPress={() => {
              logFeedback('edited', '');
              // Navigate to add-part with pre-filled data
              router.back();
            }}
          >
            <MaterialIcons name="edit" size={18} color="#71717a" />
            <Text className="ml-2 text-base font-medium text-zinc-700 dark:text-zinc-300">
              Edit Manually
            </Text>
          </Pressable>

          <Pressable
            className="flex-row items-center justify-center py-3"
            onPress={handleReject}
          >
            <MaterialIcons name="close" size={18} color="#ef4444" />
            <Text className="ml-1.5 text-base text-danger">Not a Match</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80
      ? 'bg-green-100 text-green-700'
      : pct >= 60
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-red-100 text-red-700';

  return (
    <View className={`rounded-full px-2 py-0.5 ${color.split(' ')[0]}`}>
      <Text className={`text-xs font-semibold ${color.split(' ')[1]}`}>
        {pct}%
      </Text>
    </View>
  );
}
