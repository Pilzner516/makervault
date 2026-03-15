import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Part, NewPart } from '@/lib/types';

interface InventoryStore {
  parts: Part[];
  isLoading: boolean;
  fetchParts: () => Promise<void>;
  addPart: (part: NewPart) => Promise<void>;
  updatePart: (id: string, updates: Partial<Part>) => Promise<void>;
  deletePart: (id: string) => Promise<void>;
  decrementQuantity: (id: string, amount: number) => Promise<void>;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  parts: [],
  isLoading: false,

  fetchParts: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    set({ parts: data as Part[], isLoading: false });
  },

  addPart: async (part) => {
    const { data, error } = await supabase
      .from('parts')
      .insert(part)
      .select()
      .single();
    if (error) throw error;
    set({ parts: [data as Part, ...get().parts] });
  },

  updatePart: async (id, updates) => {
    const { data, error } = await supabase
      .from('parts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    set({
      parts: get().parts.map((p) => (p.id === id ? (data as Part) : p)),
    });
  },

  deletePart: async (id) => {
    const { error } = await supabase.from('parts').delete().eq('id', id);
    if (error) throw error;
    set({ parts: get().parts.filter((p) => p.id !== id) });
  },

  decrementQuantity: async (id, amount) => {
    const part = get().parts.find((p) => p.id === id);
    if (!part) return;
    const newQty = Math.max(0, part.quantity - amount);
    await get().updatePart(id, { quantity: newQty });
  },
}));
