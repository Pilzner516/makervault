import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Supplier {
  id: string;
  name: string;
  base_url: string | null;
  is_mv_preferred: boolean;
  countries: string[];
  logo_bg: string;
  logo_text: string;
  logo_label: string;
  url_template: string | null;
  affiliate_url_template: string | null;
  affiliate_code: string | null;
  affiliate_network: string | null;
  commission_rate: string | null;
  description: string | null;
  category: string | null;
  sort_order: number;
}

export interface UserSupplierPref {
  id: string;
  user_id: string;
  supplier_id: string;
  is_favourite: boolean;
  is_enabled: boolean;
  sort_order: number;
}

export interface UserSettings {
  user_id: string;
  country_code: string;
  show_global: boolean;
  amazon_affiliate_tag: string | null;
  jameco_avantlink_id: string | null;
  home_depot_impact_id: string | null;
}

interface SupplierStore {
  suppliers: Supplier[];
  userPrefs: UserSupplierPref[];
  userSettings: UserSettings | null;
  isLoading: boolean;

  fetchAll: () => Promise<void>;
  toggleFavourite: (supplierId: string) => Promise<void>;
  toggleEnabled: (supplierId: string) => Promise<void>;
  setCountry: (code: string) => Promise<void>;
  setShowGlobal: (show: boolean) => Promise<void>;
  setAffiliateCode: (field: 'amazon_affiliate_tag' | 'jameco_avantlink_id' | 'home_depot_impact_id', code: string) => Promise<void>;
  getSupplierUrl: (supplier: Supplier, query: string) => string;

  // Computed
  favourites: () => Supplier[];
  mvPreferred: () => Supplier[];
  userEnabled: () => Supplier[];
  filtered: () => Supplier[];
}

export const useSupplierStore = create<SupplierStore>((set, get) => ({
  suppliers: [],
  userPrefs: [],
  userSettings: null,
  isLoading: false,

  fetchAll: async () => {
    set({ isLoading: true });
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch all suppliers
    const { data: suppData } = await supabase
      .from('suppliers')
      .select('*')
      .order('sort_order', { ascending: true });

    const suppliers = (suppData ?? []) as Supplier[];

    // Fetch user prefs
    let userPrefs: UserSupplierPref[] = [];
    if (user) {
      const { data: prefData } = await supabase
        .from('user_supplier_prefs')
        .select('*')
        .eq('user_id', user.id);
      userPrefs = (prefData ?? []) as UserSupplierPref[];
    }

    // Fetch user settings
    let userSettings: UserSettings | null = null;
    if (user) {
      const { data: settData } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settData) {
        userSettings = settData as UserSettings;
      } else {
        // Create default settings
        const { data: newSettings } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id })
          .select()
          .single();
        userSettings = (newSettings as UserSettings) ?? null;
      }
    }

    set({ suppliers, userPrefs, userSettings, isLoading: false });
  },

  toggleFavourite: async (supplierId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const prefs = get().userPrefs;
    const existing = prefs.find((p) => p.supplier_id === supplierId);

    if (existing) {
      const newVal = !existing.is_favourite;
      // Check max 4 favourites
      if (newVal && prefs.filter((p) => p.is_favourite).length >= 4) return;

      await supabase
        .from('user_supplier_prefs')
        .update({ is_favourite: newVal })
        .eq('id', existing.id);

      set({
        userPrefs: prefs.map((p) =>
          p.id === existing.id ? { ...p, is_favourite: newVal } : p
        ),
      });
    } else {
      // Check max 4
      if (prefs.filter((p) => p.is_favourite).length >= 4) return;

      const { data } = await supabase
        .from('user_supplier_prefs')
        .insert({ user_id: user.id, supplier_id: supplierId, is_favourite: true, is_enabled: true })
        .select()
        .single();

      if (data) {
        set({ userPrefs: [...prefs, data as UserSupplierPref] });
      }
    }
  },

  toggleEnabled: async (supplierId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const prefs = get().userPrefs;
    const existing = prefs.find((p) => p.supplier_id === supplierId);

    if (existing) {
      const newVal = !existing.is_enabled;
      await supabase
        .from('user_supplier_prefs')
        .update({ is_enabled: newVal })
        .eq('id', existing.id);

      set({
        userPrefs: prefs.map((p) =>
          p.id === existing.id ? { ...p, is_enabled: newVal } : p
        ),
      });
    } else {
      const { data } = await supabase
        .from('user_supplier_prefs')
        .insert({ user_id: user.id, supplier_id: supplierId, is_enabled: true })
        .select()
        .single();

      if (data) {
        set({ userPrefs: [...prefs, data as UserSupplierPref] });
      }
    }
  },

  setCountry: async (code) => {
    const settings = get().userSettings;
    if (!settings) return;

    await supabase
      .from('user_settings')
      .update({ country_code: code, updated_at: new Date().toISOString() })
      .eq('user_id', settings.user_id);

    set({ userSettings: { ...settings, country_code: code } });
  },

  setShowGlobal: async (show) => {
    const settings = get().userSettings;
    if (!settings) return;

    await supabase
      .from('user_settings')
      .update({ show_global: show, updated_at: new Date().toISOString() })
      .eq('user_id', settings.user_id);

    set({ userSettings: { ...settings, show_global: show } });
  },

  setAffiliateCode: async (field, code) => {
    const settings = get().userSettings;
    if (!settings) return;

    await supabase
      .from('user_settings')
      .update({ [field]: code || null, updated_at: new Date().toISOString() })
      .eq('user_id', settings.user_id);

    set({ userSettings: { ...settings, [field]: code || null } });
  },

  getSupplierUrl: (supplier, query) => {
    const encoded = encodeURIComponent(query);
    const settings = get().userSettings;

    // Check if affiliate URL is available and user has the code
    if (supplier.affiliate_url_template && settings) {
      let affiliateCode: string | null = null;

      if (supplier.name === 'Amazon') affiliateCode = settings.amazon_affiliate_tag;
      else if (supplier.name === 'Jameco') affiliateCode = settings.jameco_avantlink_id;
      else if (supplier.name === 'Home Depot') affiliateCode = settings.home_depot_impact_id;

      if (affiliateCode) {
        return supplier.affiliate_url_template
          .replace('{query}', encoded)
          .replace('{affiliate_code}', affiliateCode);
      }
    }

    // Plain URL
    if (supplier.url_template) {
      return supplier.url_template.replace('{query}', encoded);
    }

    // Fallback
    return `${supplier.base_url ?? 'https://www.google.com/search'}?q=${encoded}`;
  },

  // ─── COMPUTED ───
  favourites: () => {
    const { suppliers, userPrefs } = get();
    const favIds = userPrefs.filter((p) => p.is_favourite).map((p) => p.supplier_id);
    return suppliers.filter((s) => favIds.includes(s.id));
  },

  mvPreferred: () => {
    return get().suppliers.filter((s) => s.is_mv_preferred);
  },

  userEnabled: () => {
    const { suppliers, userPrefs } = get();
    const enabledIds = userPrefs.filter((p) => p.is_enabled && !p.is_favourite).map((p) => p.supplier_id);
    return suppliers.filter((s) => enabledIds.includes(s.id) && !s.is_mv_preferred);
  },

  filtered: () => {
    const { suppliers, userSettings } = get();
    const country = userSettings?.country_code ?? 'US';
    const showGlobal = userSettings?.show_global ?? true;

    return suppliers.filter((s) => {
      if (s.countries.includes(country)) return true;
      if (showGlobal && s.countries.includes('GLOBAL')) return true;
      return false;
    });
  },
}));
