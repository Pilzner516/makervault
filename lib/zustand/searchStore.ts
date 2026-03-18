import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Part } from '@/lib/types';

interface SearchStore {
  query: string;
  results: Part[];
  isSearching: boolean;
  recentSearches: string[];
  initialized: boolean;
  setQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
  loadRecentSearches: () => Promise<void>;
}

export const useSearchStore = create<SearchStore>((set, get) => ({
  query: '',
  results: [],
  isSearching: false,
  recentSearches: [],
  initialized: false,

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

    // Track search in local history
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

  loadRecentSearches: async () => {
    if (get().initialized) return;
    if (!isSupabaseConfigured()) {
      set({ initialized: true });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('search_history')
        .select('query')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        // Deduplicate while preserving order (most recent first)
        const seen = new Set<string>();
        const unique: string[] = [];
        for (const row of data as Array<{ query: string }>) {
          const q = row.query;
          if (q && !seen.has(q)) {
            seen.add(q);
            unique.push(q);
          }
        }
        set({ recentSearches: unique });
      }
    } catch {
      // Non-critical — keep whatever local state we have
    }

    set({ initialized: true });
  },
}));
