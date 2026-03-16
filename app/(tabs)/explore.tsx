import { View, FlatList, ActivityIndicator } from 'react-native';
import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ScreenLayout, ScreenHeader, SearchBar,
  FilterPillRow, FilterPill, EngravingLabel,
  PanelCard, ItemRow, EmptyState, PrimaryButton,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { useSearchStore } from '@/lib/zustand/searchStore';
import { smartSearch } from '@/lib/search';
import type { Part } from '@/lib/types';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { query, results, isSearching, recentSearches, setQuery, search, clearResults } =
    useSearchStore();

  const [isSmartSearching, setIsSmartSearching] = useState(false);
  const [smartResults, setSmartResults] = useState<Part[]>([]);
  const [searchMode, setSearchMode] = useState<'basic' | 'smart'>('basic');

  const displayResults = searchMode === 'smart' ? smartResults : results;
  const isLoading = searchMode === 'smart' ? isSmartSearching : isSearching;

  const handleSearch = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        clearResults();
        setSmartResults([]);
        return;
      }
      if (searchMode === 'smart') {
        setIsSmartSearching(true);
        try {
          const res = await smartSearch(text);
          setSmartResults(res);
        } catch {
          await search(text);
          setSearchMode('basic');
        } finally {
          setIsSmartSearching(false);
        }
      } else {
        await search(text);
      }
    },
    [searchMode, search, clearResults]
  );

  const renderResult = useCallback(
    ({ item }: { item: Part }) => (
      <ItemRow
        iconLabel={(item.category ?? item.name).slice(0, 3).toUpperCase()}
        name={item.name}
        meta={[item.manufacturer, item.mpn, item.category].filter(Boolean).join(' · ')}
        rightText={String(item.quantity)}
        status={item.quantity === 0 ? 'out' : item.quantity <= item.low_stock_threshold ? 'low' : 'none'}
        onPress={() => router.push(`/part/${item.id}`)}
      />
    ),
    [router]
  );

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <ScreenHeader title="Search" subtitle="Find parts in your inventory" />

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={searchMode === 'smart' ? 'Ask naturally…' : 'Search by name, MPN…'}
      />

      <FilterPillRow>
        <FilterPill label="Keyword" active={searchMode === 'basic'} onPress={() => setSearchMode('basic')} />
        <FilterPill label="AI Search" active={searchMode === 'smart'} onPress={() => setSearchMode('smart')} />
      </FilterPillRow>

      {isLoading && (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      )}

      {!isLoading && displayResults.length > 0 && (
        <>
          <EngravingLabel label={`${displayResults.length} result${displayResults.length !== 1 ? 's' : ''}`} />
          <FlatList
            data={displayResults}
            renderItem={renderResult}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          />
        </>
      )}

      {!isLoading && query.trim() && displayResults.length === 0 && !isSearching && (
        <EmptyState
          icon="search-outline"
          title={`No parts match "${query}"`}
          actionLabel="Shop for it"
          onAction={() => router.push({ pathname: '/reorder', params: { name: query, mpn: '' } })}
        />
      )}

      {!query.trim() && (
        <EmptyState
          icon="search-outline"
          title="Search your inventory"
          subtitle="Search by name, part number, category, or use AI Search for natural language"
        />
      )}
    </ScreenLayout>
  );
}
