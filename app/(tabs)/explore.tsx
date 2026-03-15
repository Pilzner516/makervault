import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSearchStore } from '@/lib/zustand/searchStore';
import { smartSearch } from '@/lib/search';
import type { Part } from '@/lib/types';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
          // Fall back to basic
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

  const handleSubmit = () => {
    handleSearch(query);
  };

  const renderResult = useCallback(
    ({ item }: { item: Part }) => (
      <Pressable
        className="mx-4 mb-2 flex-row items-center rounded-xl bg-white p-4 dark:bg-zinc-800"
        onPress={() => router.push(`/part/${item.id}`)}
      >
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <MaterialIcons name="memory" size={22} color="#0a7ea4" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            {item.name}
          </Text>
          <Text className="text-sm text-zinc-500">
            {[item.manufacturer, item.mpn, item.category].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {item.quantity}
          </Text>
          {item.quantity <= item.low_stock_threshold && (
            <MaterialIcons name="warning" size={14} color="#f59e0b" />
          )}
        </View>
      </Pressable>
    ),
    [router]
  );

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 pb-2 pt-3">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Search
        </Text>
      </View>

      {/* Search bar */}
      <View className="mx-4 mb-2 flex-row items-center rounded-xl bg-zinc-200/60 px-3 dark:bg-zinc-800">
        <MaterialIcons name="search" size={20} color="#a1a1aa" />
        <TextInput
          className="ml-2 flex-1 py-3 text-base text-zinc-900 dark:text-zinc-100"
          placeholder={
            searchMode === 'smart'
              ? 'Ask naturally — "do I have any 10k resistors?"'
              : 'Search by name, MPN, category...'
          }
          placeholderTextColor="#a1a1aa"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => {
              setQuery('');
              clearResults();
              setSmartResults([]);
            }}
          >
            <MaterialIcons name="close" size={18} color="#a1a1aa" />
          </Pressable>
        )}
      </View>

      {/* Mode toggle */}
      <View className="mx-4 mb-3 flex-row gap-2">
        <Pressable
          className={`flex-1 items-center rounded-lg py-2 ${
            searchMode === 'basic'
              ? 'bg-primary'
              : 'bg-zinc-200 dark:bg-zinc-800'
          }`}
          onPress={() => setSearchMode('basic')}
        >
          <Text
            className={`text-sm font-medium ${
              searchMode === 'basic' ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Keyword
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 flex-row items-center justify-center gap-1 rounded-lg py-2 ${
            searchMode === 'smart'
              ? 'bg-primary'
              : 'bg-zinc-200 dark:bg-zinc-800'
          }`}
          onPress={() => setSearchMode('smart')}
        >
          <MaterialIcons
            name="auto-awesome"
            size={14}
            color={searchMode === 'smart' ? '#ffffff' : '#71717a'}
          />
          <Text
            className={`text-sm font-medium ${
              searchMode === 'smart' ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            AI Search
          </Text>
        </Pressable>
      </View>

      {/* Loading */}
      {isLoading && (
        <View className="items-center py-8">
          <ActivityIndicator size="small" color="#0a7ea4" />
          <Text className="mt-2 text-sm text-zinc-400">
            {searchMode === 'smart' ? 'AI is parsing your query...' : 'Searching...'}
          </Text>
        </View>
      )}

      {/* Results */}
      {!isLoading && displayResults.length > 0 && (
        <>
          <Text className="mx-5 mb-2 text-sm text-zinc-400">
            {displayResults.length} result{displayResults.length !== 1 ? 's' : ''}
          </Text>
          <FlatList
            data={displayResults}
            renderItem={renderResult}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          />
        </>
      )}

      {/* No results */}
      {!isLoading && query.trim() && displayResults.length === 0 && !isSearching && (
        <View className="items-center py-12 px-8">
          <MaterialIcons name="search-off" size={48} color="#a1a1aa" />
          <Text className="mt-3 text-base text-zinc-500">
            No parts found for "{query}"
          </Text>
          <Pressable
            className="mt-4 flex-row items-center rounded-lg bg-primary px-5 py-2.5"
            onPress={() =>
              router.push({ pathname: '/reorder', params: { name: query, mpn: '' } })
            }
          >
            <MaterialIcons name="shopping-cart" size={18} color="#fff" />
            <Text className="ml-2 font-medium text-white">Shop for it</Text>
          </Pressable>
        </View>
      )}

      {/* Recent searches (when idle) */}
      {!query.trim() && recentSearches.length > 0 && (
        <View className="px-4">
          <Text className="mb-2 text-sm font-semibold uppercase text-zinc-400">
            Recent Searches
          </Text>
          {recentSearches.slice(0, 8).map((term, i) => (
            <Pressable
              key={`${term}-${i}`}
              className="flex-row items-center py-2.5 border-b border-zinc-100 dark:border-zinc-800"
              onPress={() => {
                setQuery(term);
                handleSearch(term);
              }}
            >
              <MaterialIcons name="history" size={18} color="#a1a1aa" />
              <Text className="ml-3 flex-1 text-base text-zinc-700 dark:text-zinc-300">
                {term}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Empty idle state */}
      {!query.trim() && recentSearches.length === 0 && (
        <View className="items-center py-16 px-8">
          <MaterialIcons name="search" size={56} color="#d4d4d8" />
          <Text className="mt-4 text-center text-base text-zinc-400">
            Search your inventory by name, part number, category, or ask naturally with AI Search
          </Text>
        </View>
      )}
    </View>
  );
}
