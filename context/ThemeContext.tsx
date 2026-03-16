/**
 * MakerVault — Theme Context
 * ===========================
 * Wraps the app so every screen can read the active theme colors.
 *
 * Setup:
 *   1. Wrap your root layout with <ThemeProvider>
 *   2. In any component: const { colors, theme, setTheme, allThemes } = useTheme()
 *   3. Use colors.accent, colors.bgCard, etc — never hardcode hex values
 *
 * The chosen theme is persisted to AsyncStorage and restored on next launch.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_THEMES, DEFAULT_THEME_ID, getThemeById } from '@/constants/themes';
import type { ThemeColors, ThemeDefinition } from '@/constants/themes';

const STORAGE_KEY = '@makervault_theme';

// ─── CONTEXT SHAPE ────────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: ThemeDefinition;           // full theme object (id, name, colors, etc.)
  colors: ThemeColors;              // shortcut — same as theme.colors
  setThemeById: (id: string) => void;
  allThemes: ThemeDefinition[];
  isLoading: boolean;               // true on first launch while AsyncStorage loads
}

// ─── CONTEXT ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<string>(DEFAULT_THEME_ID);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme on mount — only accept IDs that exist in current theme list
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => {
        if (saved && ALL_THEMES.some(t => t.id === saved)) {
          setThemeId(saved);
        } else if (saved) {
          // Stale theme from old version — clear it
          AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const setThemeById = useCallback((id: string) => {
    setThemeId(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  }, []);

  const theme = getThemeById(themeId);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors: theme.colors,
        setThemeById,
        allThemes: ALL_THEMES,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
