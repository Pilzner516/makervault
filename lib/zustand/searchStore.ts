import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Part } from '@/lib/types';

interface SearchStore {
  query: string;
  results: Part[];
  isSearching: boolean;
  recentSearches: string[];
  setQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
}

export const useSearchStore = create<SearchStore>((set, get) => ({
  query: '',
  results: [],
  isSearching: false,
  recentSearches: [],

  setQuery: (query) => set({ query }),

  search: async (query) => {
    if (!query.trim()) {
      set({ results: [], isSearching: false });
      return;
    }

    set({ isSearching: true, query });

    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .or(
        `name.ilike.%${query}%,manufacturer.ilike.%${query}%,mpn.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`
      )
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Track search in history
    const recent = get().recentSearches.filter((s) => s !== query);
    recent.unshift(query);

    set({
      results: data as Part[],
      isSearching: false,
      recentSearches: recent.slice(0, 20),
    });

    // Log search to DB (fire and forget)
    supabase
      .from('search_history')
      .insert({ query, result_count: data.length })
      .then();
  },

  clearResults: () => set({ results: [], query: '' }),
}));
