import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

let _client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const supabaseKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    '';

  const url = supabaseUrl || 'https://placeholder.supabase.co';
  const key = supabaseKey || 'placeholder-key';

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      'Supabase URL or key not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }

  // Resolve storage — AsyncStorage is for native platforms only
  let authStorage: Record<string, unknown> | undefined;
  if (Platform.OS !== 'web') {
    try {
      authStorage = require('@react-native-async-storage/async-storage').default;
    } catch {
      // AsyncStorage not available
    }
  }

  _client = createClient(url, key, {
    auth: {
      storage: authStorage as Parameters<typeof createClient>[2] extends { auth?: { storage?: infer S } } ? S : never,
      autoRefreshToken: Boolean(supabaseUrl && supabaseKey),
      persistSession: Boolean(supabaseUrl && supabaseKey && authStorage),
      detectSessionInUrl: false,
    },
  });

  return _client;
}

// Lazy proxy — nothing runs until a property on `supabase` is actually accessed
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    try {
      return Reflect.get(getSupabaseClient(), prop, receiver);
    } catch (e) {
      console.error('Supabase client error:', e);
      throw e;
    }
  },
});

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL &&
      (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  );
}
