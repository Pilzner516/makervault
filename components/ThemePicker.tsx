/**
 * MakerVault — Theme Picker
 * ==========================
 * Drop this into your Settings screen (or as its own screen).
 * Shows all available themes as swatches. Tapping one applies it instantly.
 *
 * Usage:
 *   import { ThemePicker } from '@/components/ThemePicker';
 *   // Then inside your Settings screen JSX:
 *   <ThemePicker />
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeDefinition } from '@/constants/themes';

export function ThemePicker() {
  const { theme: activeTheme, colors, setThemeById, allThemes } = useTheme();

  return (
    <View>
      {/* Section header */}
      <View style={[styles.sectionHeader, { borderBottomColor: colors.borderSubtle }]}>
        <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>
          APPEARANCE
        </Text>
      </View>

      {/* Theme grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.swatchRow}
      >
        {allThemes.map(theme => (
          <ThemeSwatch
            key={theme.id}
            theme={theme}
            isActive={theme.id === activeTheme.id}
            onSelect={() => setThemeById(theme.id)}
          />
        ))}
      </ScrollView>

      {/* Active theme name */}
      <View style={[styles.activeRow, { borderTopColor: colors.borderSubtle }]}>
        <Ionicons name="color-palette-outline" size={15} color={colors.accent} />
        <Text style={[styles.activeName, { color: colors.textMuted }]}>
          {activeTheme.name}
        </Text>
        <Text style={[styles.activeDesc, { color: colors.textFaint }]}>
          {activeTheme.description}
        </Text>
      </View>
    </View>
  );
}

// ─── SWATCH ───────────────────────────────────────────────────────────────────

function ThemeSwatch({
  theme,
  isActive,
  onSelect,
}: {
  theme: ThemeDefinition;
  isActive: boolean;
  onSelect: () => void;
}) {
  const [bg, accent, card] = theme.previewColors;

  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.75}
      style={styles.swatchWrap}
    >
      {/* Mini phone mockup */}
      <View
        style={[
          styles.swatchPhone,
          { backgroundColor: bg, borderColor: isActive ? accent : '#333' },
          isActive && styles.swatchPhoneActive,
        ]}
      >
        {/* Simulated stat tile */}
        <View style={[styles.swatchTile, { backgroundColor: card, borderColor: accent + '40' }]}>
          <View style={[styles.swatchAccentDot, { backgroundColor: accent }]} />
          <View style={[styles.swatchBarShort, { backgroundColor: accent + '60' }]} />
        </View>

        {/* Simulated list rows */}
        <View style={[styles.swatchRow2, { backgroundColor: card }]}>
          <View style={[styles.swatchDot, { backgroundColor: '#32b464' }]} />
          <View style={[styles.swatchBarLong, { backgroundColor: bg }]} />
        </View>
        <View style={[styles.swatchRow2, { backgroundColor: card, marginTop: 2 }]}>
          <View style={[styles.swatchDot, { backgroundColor: '#f05032' }]} />
          <View style={[styles.swatchBarMed, { backgroundColor: bg }]} />
        </View>

        {/* Simulated nav bar */}
        <View style={[styles.swatchNav, { backgroundColor: bg, borderTopColor: card }]}>
          <View style={[styles.swatchNavDot, { backgroundColor: accent }]} />
          <View style={[styles.swatchNavDot, { backgroundColor: bg }]} />
          <View style={[styles.swatchNavDot, { backgroundColor: bg }]} />
          <View style={[styles.swatchNavDot, { backgroundColor: bg }]} />
        </View>

        {/* Active checkmark */}
        {isActive && (
          <View style={[styles.swatchCheck, { backgroundColor: accent }]}>
            <Ionicons name="checkmark" size={10} color="#fff" />
          </View>
        )}
      </View>

      <Text
        style={[
          styles.swatchLabel,
          { color: isActive ? accent : '#666' },
        ]}
        numberOfLines={1}
      >
        {theme.name}
      </Text>
    </TouchableOpacity>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  swatchRow: {
    paddingHorizontal: 12,
    gap: 10,
    flexDirection: 'row',
  },
  swatchWrap: {
    alignItems: 'center',
    gap: 6,
    width: 72,
  },
  swatchPhone: {
    width: 68,
    height: 100,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    padding: 5,
    gap: 3,
    position: 'relative',
  },
  swatchPhoneActive: {
    borderWidth: 2,
  },
  swatchTile: {
    height: 22,
    borderRadius: 5,
    borderWidth: 0.5,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swatchAccentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  swatchBarShort: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  swatchRow2: {
    height: 14,
    borderRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
    gap: 4,
  },
  swatchDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  swatchBarLong: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  swatchBarMed: {
    width: '60%',
    height: 3,
    borderRadius: 2,
  },
  swatchNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 14,
    borderTopWidth: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  swatchNavDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    opacity: 0.7,
  },
  swatchCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 12,
    borderTopWidth: 0.5,
    flexWrap: 'wrap',
  },
  activeName: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeDesc: {
    fontSize: 11,
    flex: 1,
  },
});
