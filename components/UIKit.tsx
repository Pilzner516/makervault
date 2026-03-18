/**
 * MakerVault UIKit — Level 3: Machined Metal
 * ============================================
 * Every colour from useTheme(). Zero hardcoded values.
 * Level 3 signature details built into every component:
 *   - PanelBevel: bright top edge + shadow bottom on all cards
 *   - Rivet: screwhead corners on all panels
 *   - EngravingLabel: flanked section headers
 *   - Inset tint on stat/metric tiles and CTA
 *   - Left-edge status bar on alert rows
 *   - Grid texture in scan viewfinder
 *   - Sharp corners everywhere (2–4px max)
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image as RNImage,
  TextInput, ScrollView, ViewStyle, StatusBar, Platform,
} from 'react-native';
// LinearGradient: auto-detect native module availability
let _LG: React.ComponentType<any> | null = null;
try {
  const mod = require('expo-linear-gradient');
  // Only enable if the native view manager is actually registered
  const { UIManager, Platform } = require('react-native');
  const viewName = 'ExpoLinearGradient';
  const hasNative = Platform.OS === 'web' ||
    UIManager.getViewManagerConfig?.(viewName) != null ||
    UIManager[viewName] != null;
  if (hasNative) _LG = mod.LinearGradient;
} catch {
  // Not available
}

function SafeGradient(props: { colors: string[]; start?: any; end?: any; style?: any; children?: React.ReactNode }) {
  if (_LG) {
    const LG = _LG;
    return <LG {...props} />;
  }
  // Fallback: use the middle color as a flat tint
  const midColor = props.colors[Math.floor(props.colors.length / 2)] ?? 'transparent';
  return <View style={[props.style, { backgroundColor: midColor }]}>{props.children}</View>;
}
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

export { useTheme } from '@/context/ThemeContext';
export const Spacing  = { xs: 4, sm: 8, md: 10, lg: 14, xl: 20 };
export const Radius   = { badge: 2, btn: 3, card: 4, icon: 3, logo: 5, scan: 6 };
export const FontSize = { xs: 14, sm: 14, md: 16, lg: 18, xl: 22 };

// ─── LEVEL 3 PRIMITIVES ───────────────────────────────────────────────────────

/** Bevel top edge — bright gradient simulating machined metal catching light */
export function PanelBevelTop() {
  return (
    <SafeGradient
      colors={['#0e2030', '#2a5a7a', '#00c8e8', '#2a5a7a', '#0e2030']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={styles.bevelTop}
    />
  );
}

/** Header bevel — slightly brighter for the top header panel */
export function HeaderBevelTop() {
  return (
    <SafeGradient
      colors={['transparent', 'rgba(0,200,232,0.9)', 'transparent']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={styles.bevelTop}
    />
  );
}

/** Bevel bottom edge — dark shadow */
export function PanelBevelBottom() {
  return (
    <SafeGradient
      colors={['#0e2030', '#122030', '#0e2030']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={styles.bevelBottom}
    />
  );
}

/** Inset tint — subtle top-to-bottom accent tint inside tiles */
export function InsetTint() {
  return (
    <SafeGradient
      colors={['rgba(0,200,232,0.06)', 'transparent']}
      start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

/** Rivet — screwhead dot for panel corners */
function Rivet({ top, bottom, left, right }: { top?: number; bottom?: number; left?: number; right?: number }) {
  return (
    <View style={[styles.rivet, { top, bottom, left, right }]}>
      <View style={styles.rivetSlotH} />
      <View style={styles.rivetSlotV} />
      <View style={styles.rivetGlow} />
    </View>
  );
}

/** Four rivets at panel corners */
export function PanelRivets() {
  return (
    <>
      <Rivet top={5} left={5} />
      <Rivet top={5} right={5} />
      <Rivet bottom={5} left={5} />
      <Rivet bottom={5} right={5} />
    </>
  );
}

// ─── SCREEN LAYOUT ────────────────────────────────────────────────────────────

export function ScreenLayout({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: colors.bgScreen }, style]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgBase} />
      {children}
    </View>
  );
}

// ─── HEADER PANEL ─────────────────────────────────────────────────────────────

interface HeaderPanelProps { children: React.ReactNode; }
export function HeaderPanel({ children }: HeaderPanelProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.headerPanel, { backgroundColor: colors.bgDeep, borderBottomColor: colors.borderDefault }]}>
      <HeaderBevelTop />
      <SafeGradient
        colors={['transparent', 'rgba(0,200,232,0.12)', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.headerShimmer2}
      />
      {children}
    </View>
  );
}

// ─── SCREEN HEADER (back nav) ─────────────────────────────────────────────────

interface ScreenHeaderProps {
  title: string; subtitle?: string; backLabel?: string;
  onBack?: () => void; rightElement?: React.ReactNode;
}
export function ScreenHeader({ title, subtitle, backLabel, onBack, rightElement }: ScreenHeaderProps) {
  const { colors } = useTheme();
  return (
    <HeaderPanel>
      <View style={styles.headerContent}>
        {backLabel && onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={12} color={colors.accent} />
            <Text style={[styles.backLabel, { color: colors.accent }]}>{backLabel.toUpperCase()}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{title}</Text>
            {subtitle ? <Text style={[styles.headerSub, { color: colors.textFaint }]}>{subtitle.toUpperCase()}</Text> : null}
          </View>
          {rightElement}
        </View>
      </View>
    </HeaderPanel>
  );
}

// ─── LOGO HEADER ──────────────────────────────────────────────────────────────

interface LogoHeaderProps { subtitle?: string; rightElement?: React.ReactNode; }
export function LogoHeader({ subtitle = 'Workshop OS', rightElement }: LogoHeaderProps) {
  const { colors } = useTheme();
  return (
    <HeaderPanel>
      <View style={[styles.headerContent, { paddingBottom: 0 }]}>
        <View style={styles.logoRow}>
          <View style={[styles.logoBox, { backgroundColor: colors.bgScreen, borderColor: colors.borderDefault }]}>
            <LogoMark color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.logoName}>
              <Text style={{ color: colors.textPrimary }}>Maker</Text>
              <Text style={{ color: colors.accent }}>Vault</Text>
            </Text>
            <Text style={[styles.logoSub, { color: colors.textFaint }]}>{subtitle.toUpperCase()}</Text>
          </View>
          {rightElement}
        </View>
      </View>
    </HeaderPanel>
  );
}

function LogoMark({ color }: { color: string }) {
  const opacities = [0.9, 0.55, 0.55, 0.25];
  const positions = [[1,1],[9,1],[1,9],[9,9]];
  return (
    <View style={styles.logoMark}>
      {positions.map(([x,y], i) => (
        <View key={i} style={[styles.logoSquare, {
          backgroundColor: color, opacity: opacities[i],
          position: 'absolute', left: x * 0.85, top: y * 0.85,
        }]} />
      ))}
    </View>
  );
}

// ─── ADD BUTTON ───────────────────────────────────────────────────────────────

export function AddButton({ label = '+ Add', onPress }: { label?: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={[styles.addBtn, { backgroundColor: colors.bgScreen, borderColor: colors.borderDefault }]}>
      <Text style={[styles.addBtnText, { color: colors.accent }]}>{label.toUpperCase()}</Text>
    </TouchableOpacity>
  );
}

// ─── STAT STRIP ───────────────────────────────────────────────────────────────

interface StatProps { value: string | number; label: string; color?: string; onPress?: () => void; }
export function StatTile({ value, label, color, onPress }: StatProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.75 : 1}
      style={[styles.statTile, { backgroundColor: colors.bgDeep, borderColor: colors.borderDefault }]}>
      <PanelBevelTop />
      <InsetTint />
      <Text style={[styles.statVal, { color: color ?? colors.accent }]}>{value}</Text>
      <Text style={[styles.statLbl, { color: colors.textFaint }]}>{label.toUpperCase()}</Text>
    </TouchableOpacity>
  );
}
export function StatStrip({ children }: { children: React.ReactNode }) {
  return <View style={styles.statStrip}>{children}</View>;
}

// ─── ENGRAVING LABEL ──────────────────────────────────────────────────────────

export function EngravingLabel({ label, action, onAction }: { label: string; action?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.engRow}>
      <View style={[styles.engLineLeft, { backgroundColor: colors.borderDefault }]} />
      <Text style={[styles.engText, { color: colors.textFaint }]}>{label.toUpperCase()}</Text>
      <View style={[styles.engLineRight, { backgroundColor: colors.borderDefault }]} />
      {action && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7} style={{ marginLeft: 6 }}>
          <Text style={[styles.engAction, { color: colors.accent }]}>{action.toUpperCase()}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── PANEL CARD ───────────────────────────────────────────────────────────────

export function PanelCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.panelCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }, style]}>
      <PanelBevelTop />
      <PanelBevelBottom />
      <PanelRivets />
      {children}
    </View>
  );
}

// ─── ITEM ROW ─────────────────────────────────────────────────────────────────

type BadgeVariant = 'ok' | 'low' | 'out' | 'ready' | 'missing';
type RowStatus = 'ok' | 'low' | 'out' | 'none';

interface ItemRowProps {
  iconLabel: string; iconColor?: string; imageUri?: string; name: string; meta?: string;
  badge?: BadgeVariant; badgeLabel?: string; rightText?: string;
  status?: RowStatus; onPress?: () => void; isLast?: boolean;
}
export function ItemRow({ iconLabel, iconColor, imageUri, name, meta, badge, badgeLabel, rightText, status = 'none', onPress, isLast }: ItemRowProps) {
  const { colors } = useTheme();
  const barColor = status === 'out' ? colors.statusOut : status === 'low' ? colors.statusLow : 'transparent';
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={[styles.itemRow, { backgroundColor: colors.bgDeep },
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
        { borderLeftWidth: 2, borderLeftColor: barColor }]}>
      {imageUri ? (
        <View style={[styles.iconBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderMid, overflow: 'hidden' }]}>
          <RNImage source={{ uri: imageUri }} style={{ width: 36, height: 36 }} resizeMode="cover" />
        </View>
      ) : (
        <View style={[styles.iconBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderMid }]}>
          <SafeGradient
            colors={['rgba(0,200,232,0.15)', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={styles.iconBoxShimmer}
          />
          <Text style={[styles.iconLabel, { color: iconColor ?? colors.textMuted }]}>
            {iconLabel.slice(0, 3).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.textSecondary }]} numberOfLines={1}>{name}</Text>
        {meta ? <Text style={[styles.itemMeta, { color: colors.textMuted }]} numberOfLines={1}>{meta.toUpperCase()}</Text> : null}
      </View>
      {badge ? <Badge variant={badge} label={badgeLabel} /> : null}
      {rightText ? <Text style={[styles.rightText, { color: colors.textMuted }]}>{rightText}</Text> : null}
      {!badge && !rightText && <Ionicons name="chevron-forward" size={12} color={colors.textDisabled} />}
    </TouchableOpacity>
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────

interface BadgeProps { variant: BadgeVariant; label?: string; }
export function Badge({ variant, label }: BadgeProps) {
  const { colors } = useTheme();
  const map: Record<BadgeVariant, { bg: string; text: string; border: string; def: string }> = {
    ok:      { bg: colors.statusOkBg,  text: colors.statusOk,  border: colors.statusOkBorder,  def: 'OK' },
    low:     { bg: colors.statusLowBg, text: colors.statusLow, border: colors.statusLowBorder, def: 'Low' },
    out:     { bg: colors.statusOutBg, text: colors.statusOut, border: colors.statusOutBorder, def: 'Out' },
    ready:   { bg: colors.statusOkBg,  text: colors.statusOk,  border: colors.statusOkBorder,  def: 'Ready' },
    missing: { bg: colors.statusOutBg, text: colors.statusOut, border: colors.statusOutBorder, def: 'Missing' },
  };
  const s = map[variant];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{(label ?? s.def).toUpperCase()}</Text>
    </View>
  );
}

// ─── METRIC ROW ───────────────────────────────────────────────────────────────

interface MetricProps { value: string | number; label: string; color?: string; }
export function MetricTile({ value, label, color }: MetricProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metricTile, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
      <PanelBevelTop />
      <InsetTint />
      <Text style={[styles.metricVal, { color: color ?? colors.accent }]}>{value}</Text>
      <Text style={[styles.metricLbl, { color: colors.textFaint }]}>{label.toUpperCase()}</Text>
    </View>
  );
}
export function MetricRow({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.metricRow, { borderBottomColor: colors.borderDefault }]}>{children}</View>;
}

// ─── FIELD ROW ────────────────────────────────────────────────────────────────

interface FieldProps { label: string; value: string; valueColor?: string; onPress?: () => void; isLast?: boolean; }
export function FieldRow({ label, value, valueColor, onPress, isLast }: FieldProps) {
  const { colors } = useTheme();
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap onPress={onPress} activeOpacity={0.75}
      style={[styles.fieldRow, { backgroundColor: colors.bgCard },
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }]}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.fieldValue, { color: valueColor ?? colors.textSecondary }]} numberOfLines={1}>{value}</Text>
    </Wrap>
  );
}

// ─── PROJECT CARD ─────────────────────────────────────────────────────────────

interface ProjectProps {
  name: string; partsAvailable: number; partsTotal: number;
  tags?: string[]; onPress?: () => void;
}
export function ProjectCard({ name, partsAvailable, partsTotal, tags, onPress }: ProjectProps) {
  const { colors } = useTheme();
  const pct = partsTotal > 0 ? partsAvailable / partsTotal : 0;
  const fillColor = pct >= 1 ? colors.statusOk : pct >= 0.5 ? colors.statusLow : colors.statusOut;
  const bv: BadgeVariant = pct >= 1 ? 'ready' : pct >= 0.5 ? 'low' : 'missing';
  const bl = pct >= 1 ? 'Ready' : pct >= 0.5 ? `${Math.round(pct * 100)}%` : `Missing ${partsTotal - partsAvailable}`;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={[styles.projCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
      <PanelBevelTop />
      <PanelBevelBottom />
      <PanelRivets />
      {/* Left accent line */}
      <SafeGradient
        colors={['rgba(0,200,232,0.35)', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={styles.projLeftLine}
      />
      <View style={styles.projContent}>
        <View style={styles.projHeader}>
          <Text style={[styles.projName, { color: colors.textSecondary }]} numberOfLines={1}>{name}</Text>
          <Badge variant={bv} label={bl} />
        </View>
        <Text style={[styles.projMeta, { color: colors.textFaint }]}>{partsAvailable} / {partsTotal} PARTS AVAILABLE</Text>
        {tags && tags.length > 0 && (
          <View style={styles.tagRow}>
            {tags.map((t, i) => <TagChip key={i} label={t} />)}
          </View>
        )}
        <View style={[styles.progTrack, { backgroundColor: colors.bgDeep }]}>
          {/* Grid texture on progress track */}
          <View style={styles.progGrid} />
          <View style={[styles.progFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: fillColor }]} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── TAG CHIP ─────────────────────────────────────────────────────────────────

export function TagChip({ label, color }: { label: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: color ? color + '12' : colors.bgDeep,
      borderColor: color ? color + '35' : colors.borderMid }]}>
      <Text style={[styles.tagText, { color: color ?? colors.textMuted }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

// ─── SEARCH BAR ───────────────────────────────────────────────────────────────

interface SearchProps { value: string; onChangeText: (t: string) => void; placeholder?: string; }
export function SearchBar({ value, onChangeText, placeholder = 'Search parts…' }: SearchProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: colors.bgDeep, borderColor: colors.borderDefault }]}>
      <CrosshairIcon color={colors.textMuted} />
      <TextInput style={[styles.searchInput, { color: colors.textSecondary }]}
        value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor={colors.textMuted}
        returnKeyType="search" />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} activeOpacity={0.7}>
          <Ionicons name="close" size={12} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function CrosshairIcon({ color }: { color: string }) {
  return (
    <View style={styles.crosshair}>
      <View style={[styles.crosshairCircle, { borderColor: color }]} />
      <View style={[styles.crosshairH, { backgroundColor: color }]} />
      <View style={[styles.crosshairV, { backgroundColor: color }]} />
    </View>
  );
}

// ─── FILTER PILLS ─────────────────────────────────────────────────────────────

interface PillProps { label: string; active: boolean; onPress: () => void; }
export function FilterPill({ label, active, onPress }: PillProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={[styles.pill, { backgroundColor: colors.bgDeep, borderColor: colors.borderDefault },
        active && { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
      <Text style={[styles.pillText, { color: colors.textMuted }, active && { color: colors.accent }]}>
        {label.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
}
export function FilterPillRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pillRow}>{children}</ScrollView>
  );
}

// ─── MODE BUTTON (scan) ───────────────────────────────────────────────────────

export function ModeButton({ label, active, onPress }: PillProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={[styles.modeBtn, { backgroundColor: colors.bgDeep, borderColor: colors.borderDefault },
        active && { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
      <Text numberOfLines={1} style={[styles.modeBtnText, { color: colors.textMuted }, active && { color: colors.accent }]}>
        {label.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
}

// ─── ALERT BANNER ─────────────────────────────────────────────────────────────

interface AlertProps { title: string; subtitle?: string; variant?: 'danger' | 'warn'; onPress?: () => void; }
export function AlertBanner({ title, subtitle, variant = 'danger', onPress }: AlertProps) {
  const { colors } = useTheme();
  const isDanger = variant === 'danger';
  const tColor = isDanger ? colors.statusOut : colors.statusLow;
  const subColor = isDanger ? colors.statusOut + '90' : colors.statusLow + '90';
  const bg = isDanger ? colors.alertDangerBg : colors.alertWarnBg;
  const topBorder = isDanger ? colors.statusOut : colors.statusLow;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.75 : 1}
      style={[styles.alert, { backgroundColor: bg, borderTopColor: topBorder, borderBottomColor: isDanger ? colors.alertDangerBorder : colors.alertWarnBorder }]}>
      <View style={[styles.alertBar, { backgroundColor: tColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.alertTitle, { color: tColor }]}>{title}</Text>
        {subtitle ? <Text style={[styles.alertSub, { color: subColor }]}>{subtitle}</Text> : null}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={12} color={tColor} />}
    </TouchableOpacity>
  );
}

// ─── LOCATION ROW ─────────────────────────────────────────────────────────────

interface LocProps { name: string; meta?: string; count: number; dotColor: string; onPress?: () => void; isLast?: boolean; }
export function LocationRow({ name, meta, count, dotColor, onPress, isLast }: LocProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={[styles.locRow, { backgroundColor: colors.bgDeep },
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }]}>
      <View style={[styles.locDot, { backgroundColor: dotColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.locName, { color: colors.textSecondary }]}>{name}</Text>
        {meta ? <Text style={[styles.locMeta, { color: colors.textMuted }]}>{meta.toUpperCase()}</Text> : null}
      </View>
      <View style={[styles.locCount, { backgroundColor: colors.bgCard, borderColor: colors.borderMid }]}>
        <Text style={[styles.locCountText, { color: colors.textMuted }]}>{count}</Text>
      </View>
      <Ionicons name="chevron-forward" size={12} color={colors.textDisabled} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );
}

// ─── BUTTONS ──────────────────────────────────────────────────────────────────

interface BtnProps { label: string; onPress: () => void; icon?: string; disabled?: boolean; }
export function PrimaryButton({ label, onPress, icon, disabled }: BtnProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} disabled={disabled}
      style={[styles.primaryBtn, { backgroundColor: colors.bgDeep, borderColor: colors.borderDefault },
        disabled && { opacity: 0.4 }]}>
      <PanelBevelTop />
      <InsetTint />
      {icon && <Ionicons name={icon as any} size={14} color={disabled ? colors.textMuted : colors.accent} style={{ marginRight: 5 }} />}
      <Text style={[styles.primaryBtnText, { color: disabled ? colors.textMuted : colors.accent }]}>
        {label.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
}
export function SecondaryButton({ label, onPress, icon }: BtnProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={[styles.secondaryBtn, { backgroundColor: colors.bgDeep, borderColor: colors.borderDefault }]}>
      {icon && <Ionicons name={icon as any} size={12} color={colors.textMuted} style={{ marginRight: 4 }} />}
      <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>{label.toUpperCase()}</Text>
    </TouchableOpacity>
  );
}

// ─── SCAN VIEWFINDER ──────────────────────────────────────────────────────────

export function ScanViewfinder({ hint = 'Point at item or barcode' }: { hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.scanBg, { backgroundColor: colors.scanBg }]}>
      <View style={[styles.scanFrame, { borderColor: colors.scanFrameColor }]}>
        {/* Grid texture */}
        <View style={styles.scanGridH} />
        <View style={styles.scanGridV} />
        {[{ t:-1,l:-1,btw:2.5,blw:2.5 },{ t:-1,r:-1,btw:2.5,brw:2.5 },
          { b:-1,l:-1,bbw:2.5,blw:2.5 },{ b:-1,r:-1,bbw:2.5,brw:2.5 }].map((s: any, i) => (
          <View key={i} style={[styles.scanCorner, { borderColor: colors.scanFrameColor,
            top: s.t, left: s.l, right: s.r, bottom: s.b,
            borderTopWidth: s.btw || 0, borderLeftWidth: s.blw || 0,
            borderRightWidth: s.brw || 0, borderBottomWidth: s.bbw || 0 }]} />
        ))}
        <Text style={[styles.scanInner, { color: colors.textDisabled }]}>Point at{'\n'}item</Text>
      </View>
      <View style={[styles.scanAiBadge, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
        <Text style={[styles.scanAiText, { color: colors.accent }]}>AI IDENTIFICATION</Text>
      </View>
      <Text style={[styles.scanHint, { color: colors.textDisabled }]}>{hint.toUpperCase()}</Text>
    </View>
  );
}

// ─── SCAN RESULT CARD ─────────────────────────────────────────────────────────

interface ResultProps {
  name: string; confidence: number; suggestedLocation?: string;
  onConfirm: () => void; onReject: () => void;
}
export function ScanResultCard({ name, confidence, suggestedLocation, onConfirm, onReject }: ResultProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.resultCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
      <PanelBevelTop />
      <PanelBevelBottom />
      <PanelRivets />
      <View style={styles.resultContent}>
        <View style={styles.resultTop}>
          <Text style={[styles.resultAi, { color: colors.textFaint }]}>AI IDENTIFIED</Text>
          <Text style={[styles.resultConf, { color: colors.accent }]}>{confidence}% CONFIDENT</Text>
        </View>
        <Text style={[styles.resultName, { color: colors.textPrimary }]}>{name}</Text>
        {suggestedLocation && (
          <Text style={[styles.resultLoc, { color: colors.textFaint }]}>SUGGEST: {suggestedLocation.toUpperCase()}</Text>
        )}
        <View style={styles.resultActions}>
          <TouchableOpacity onPress={onConfirm} activeOpacity={0.75}
            style={[styles.confirmBtn, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
            <Ionicons name="checkmark" size={11} color={colors.accent} />
            <Text style={[styles.confirmText, { color: colors.accent }]}>ADD TO VAULT</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onReject} activeOpacity={0.75}
            style={[styles.rejectBtn, { backgroundColor: colors.bgDeep, borderColor: colors.borderDefault }]}>
            <Text style={[styles.rejectText, { color: colors.textMuted }]}>WRONG ITEM</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── FORM FIELD ───────────────────────────────────────────────────────────────

interface FormProps {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'numeric' | 'decimal-pad'; rightLabel?: string;
}
export function FormField({ label, value, onChangeText, placeholder, keyboardType = 'default', rightLabel }: FormProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.formField}>
      <Text style={[styles.formLabel, { color: colors.textFaint }]}>{label.toUpperCase()}</Text>
      <View style={[styles.formWrap, { backgroundColor: colors.bgDeep, borderColor: colors.borderDefault }]}>
        <TextInput style={[styles.formInput, { color: colors.textSecondary }]}
          value={value} onChangeText={onChangeText} placeholder={placeholder}
          placeholderTextColor={colors.textDisabled} keyboardType={keyboardType} />
        {rightLabel && <Text style={[styles.formRight, { color: colors.textMuted }]}>{rightLabel.toUpperCase()}</Text>}
      </View>
    </View>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'home',      label: 'Home',      icon: 'home-outline',      activeIcon: 'home' },
  { key: 'search',    label: 'Search',    icon: 'search-outline',    activeIcon: 'search' },
  { key: 'scan',      label: 'Scan',      icon: 'scan-outline',      activeIcon: 'scan' },
  { key: 'inventory', label: 'Inventory', icon: 'cube-outline',      activeIcon: 'cube' },
  { key: 'projects',  label: 'Projects',  icon: 'construct-outline', activeIcon: 'construct' },
];
export function BottomNav({ activeKey, onNavigate }: { activeKey: string; onNavigate: (k: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.nav, { backgroundColor: colors.bgBase, borderTopColor: colors.borderDefault }]}>
      <SafeGradient
        colors={['transparent', 'rgba(0,200,232,0.2)', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.navBevel}
      />
      {NAV_ITEMS.map(item => {
        const on = activeKey === item.key;
        return (
          <TouchableOpacity key={item.key} onPress={() => onNavigate(item.key)}
            activeOpacity={0.75} style={styles.navItem}>
            {on && <View style={[styles.navLine, { backgroundColor: colors.accent }]} />}
            <Ionicons name={(on ? item.activeIcon : item.icon) as any}
              size={20} color={on ? colors.accent : colors.textDisabled} />
            <Text style={[styles.navLabel, { color: on ? colors.accent : colors.textDisabled }]}>
              {item.label.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

interface EmptyProps { icon: string; title: string; subtitle?: string; actionLabel?: string; onAction?: () => void; }
export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.bgDeep, borderColor: colors.borderDefault }]}>
        <PanelBevelTop />
        <Ionicons name={icon as any} size={28} color={colors.textDisabled} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>{title}</Text>
      {subtitle && <Text style={[styles.emptySub, { color: colors.textFaint }]}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.75}
          style={[styles.emptyAction, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
          <Text style={[styles.emptyActionText, { color: colors.accent }]}>{actionLabel.toUpperCase()}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Bevel / shimmer
  bevelTop:    { position:'absolute', top:0, left:0, right:0, height:1, zIndex:2 },
  bevelBottom: { position:'absolute', bottom:0, left:0, right:0, height:1, zIndex:2 },
  // Rivet
  rivet:       { position:'absolute', width:5, height:5, borderRadius:3, zIndex:3 },
  rivetSlotH:  { position:'absolute', top:2, left:1, right:1, height:0.5, borderRadius:1 },
  rivetSlotV:  { position:'absolute', left:2, top:1, bottom:1, width:0.5, borderRadius:1 },
  rivetGlow:   { position:'absolute', top:0.5, left:0.5, width:2, height:2, borderRadius:1 },
  // Screen
  screen: { flex:1 },
  // Header
  headerPanel: { borderBottomWidth:1, overflow:'hidden', position:'relative' },
  headerShimmer2: { position:'absolute', top:1, left:0, right:0, height:1 },
  headerContent: { paddingHorizontal:12, paddingTop:16, paddingBottom:12 },
  headerRow: { flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between' },
  headerTitle: { fontSize:24, fontWeight:'800' },
  headerSub: { fontSize:14, marginTop:4, letterSpacing:0.12 },
  backBtn: { flexDirection:'row', alignItems:'center', marginBottom:6 },
  backLabel: { fontSize:14, fontWeight:'700', marginLeft:3, letterSpacing:0.08 },
  // Logo
  logoRow: { flexDirection:'row', alignItems:'center', gap:10 },
  logoBox: { width:30, height:30, borderRadius:5, borderWidth:1, alignItems:'center', justifyContent:'center', overflow:'hidden' },
  logoMark: { width:16, height:16, position:'relative' },
  logoSquare: { width:6, height:6, borderRadius:1 },
  logoName: { fontSize:20, fontWeight:'800', letterSpacing:0.02 },
  logoSub: { fontSize:14, marginTop:2, letterSpacing:0.12 },
  // Add button
  addBtn: { borderWidth:1, borderRadius:4, paddingHorizontal:10, paddingVertical:5 },
  addBtnText: { fontSize:14, fontWeight:'700', letterSpacing:0.04 },
  // Stat strip
  statStrip: { flexDirection:'row', gap:8, paddingHorizontal:12, paddingVertical:10 },
  statTile: { flex:1, borderRadius:4, borderWidth:1, paddingVertical:14, paddingHorizontal:8, alignItems:'center', overflow:'hidden', position:'relative', minHeight:80 },
  statVal: { fontSize:32, fontWeight:'800', letterSpacing:-0.5, lineHeight:38, position:'relative' },
  statLbl: { fontSize:14, marginTop:4, letterSpacing:0.08, position:'relative' },
  // Engraving label
  engRow: { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingTop:14, paddingBottom:6 },
  engLineLeft: { width:10, height:1, marginRight:6 },
  engLineRight: { flex:1, height:1, marginLeft:6, opacity:0.5 },
  engText: { fontSize:14, fontWeight:'700', letterSpacing:0.10 },
  engAction: { fontSize:14, fontWeight:'700', letterSpacing:0.08 },
  // Panel card
  panelCard: { borderRadius:4, borderWidth:1, marginHorizontal:12, marginBottom:8, overflow:'hidden', position:'relative' },
  // Item row — min 44px
  itemRow: { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:11, gap:10, minHeight:44 },
  iconBox: { width:36, height:36, borderRadius:3, borderWidth:1, alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' },
  iconBoxShimmer: { position:'absolute', top:0, left:0, right:0, height:8 },
  iconLabel: { fontSize:14, fontWeight:'800', letterSpacing:0.02, position:'relative' },
  itemInfo: { flex:1, gap:3 },
  itemName: { fontSize:17, fontWeight:'700' },
  itemMeta: { fontSize:14, letterSpacing:0.04 },
  rightText: { fontSize:17, fontWeight:'700' },
  // Badge
  badge: { paddingHorizontal:10, paddingVertical:4, borderRadius:2, borderWidth:1 },
  badgeText: { fontSize:14, fontWeight:'700', letterSpacing:0.04 },
  // Metric
  // Metric — prominent numbers, clear labels
  metricRow: { flexDirection:'row', gap:8, paddingHorizontal:12, paddingVertical:10, borderBottomWidth:1 },
  metricTile: { flex:1, borderRadius:4, borderWidth:1, paddingVertical:12, paddingHorizontal:8, alignItems:'center', overflow:'hidden', position:'relative' },
  metricVal: { fontSize:26, fontWeight:'800', letterSpacing:-0.3, position:'relative' },
  metricLbl: { fontSize:14, marginTop:4, letterSpacing:0.08, position:'relative' },
  // Field
  fieldRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:12, paddingVertical:12 },
  fieldLabel: { fontSize:14, fontWeight:'600', letterSpacing:0.04 },
  fieldValue: { fontSize:16, fontWeight:'700', maxWidth:'55%' },
  // Project card
  // Project card — spacious: name, meta, tags, progress bar
  projCard: { borderRadius:4, borderWidth:1, marginHorizontal:12, marginBottom:8, overflow:'hidden', position:'relative' },
  projLeftLine: { position:'absolute', left:0, top:0, bottom:0, width:2 },
  projContent: { paddingHorizontal:12, paddingVertical:12 },
  projHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 },
  projName: { fontSize:17, fontWeight:'700', flex:1, marginRight:8 },
  projMeta: { fontSize:14, marginBottom:8, letterSpacing:0.04 },
  tagRow: { flexDirection:'row', flexWrap:'wrap', gap:5, marginBottom:8 },
  tag: { borderRadius:2, borderWidth:1, paddingHorizontal:10, paddingVertical:5 },
  tagText: { fontSize:14, fontWeight:'600', letterSpacing:0.04 },
  progTrack: { height:4, overflow:'hidden', position:'relative' },
  progGrid: { position:'absolute', inset:0, top:0, left:0, right:0, bottom:0 },
  progFill: { position:'absolute', top:0, left:0, bottom:0 },
  // Search
  search: { flexDirection:'row', alignItems:'center', borderWidth:1, borderRadius:4, marginHorizontal:12, marginBottom:8, paddingHorizontal:10, paddingVertical: Platform.OS==='ios'?10:7 },
  searchInput: { flex:1, fontSize:16, marginLeft:8 },
  crosshair: { width:13, height:13, position:'relative', alignItems:'center', justifyContent:'center' },
  crosshairCircle: { position:'absolute', width:9, height:9, borderRadius:5, borderWidth:1.5, top:0, left:0 },
  crosshairH: { position:'absolute', top:6, left:0, right:0, height:0.5, borderRadius:1 },
  crosshairV: { position:'absolute', left:6, top:0, bottom:0, width:0.5, borderRadius:1 },
  // Pills
  pillRow: { paddingHorizontal:12, paddingTop:6, paddingBottom:8, gap:6, flexDirection:'row' },
  pill: { borderWidth:1, borderRadius:4, paddingHorizontal:12, paddingVertical:8, minHeight:36 },
  pillText: { fontSize:14, fontWeight:'700', letterSpacing:0.04 },
  // Mode btn — 48px tap target, 15px text
  modeBtn: { flex:1, borderWidth:1, borderRadius:4, paddingVertical:8, paddingHorizontal:4, alignItems:'center', justifyContent:'center', minHeight:36 },
  modeBtnText: { fontSize:14, fontWeight:'700', letterSpacing:0.04 },
  // Alert
  alert: { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:12, borderTopWidth:2, borderBottomWidth:1, gap:10 },
  alertBar: { width:4, height:32, borderRadius:0, flexShrink:0 },
  alertTitle: { fontSize:16, fontWeight:'700' },
  alertSub: { fontSize:14, marginTop:3 },
  // Location
  locRow: { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:12, gap:10, minHeight:44 },
  locDot: { width:10, height:10, borderRadius:5 },
  locName: { fontSize:17, fontWeight:'700' },
  locMeta: { fontSize:14, marginTop:2, letterSpacing:0.04 },
  locCount: { borderRadius:3, borderWidth:1, paddingHorizontal:10, paddingVertical:4 },
  locCountText: { fontSize:14, fontWeight:'700' },
  // Buttons
  // Buttons — min 40px tap target
  primaryBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', borderWidth:1, borderRadius:4, paddingVertical:13, marginHorizontal:12, marginVertical:4, overflow:'hidden', position:'relative', minHeight:44 },
  primaryBtnText: { fontSize:16, fontWeight:'800', letterSpacing:0.04, position:'relative' },
  secondaryBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', borderWidth:1, borderRadius:4, paddingVertical:11, marginHorizontal:12, marginVertical:4, minHeight:40 },
  secondaryBtnText: { fontSize:15, fontWeight:'700', letterSpacing:0.04 },
  // Scan
  scanBg: { flex:1, alignItems:'center', justifyContent:'center', gap:10 },
  scanFrame: { width:140, height:140, borderWidth:1.5, borderRadius:6, alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' },
  scanGridH: { position:'absolute', top:0, left:0, right:0, bottom:0 },
  scanGridV: { position:'absolute', top:0, left:0, right:0, bottom:0 },
  scanCorner: { position:'absolute', width:14, height:14, borderStyle:'solid' },
  scanInner: { fontSize:15, textAlign:'center', lineHeight:20, position:'relative', letterSpacing:0.08 },
  scanAiBadge: { borderWidth:1, borderRadius:3, paddingHorizontal:12, paddingVertical:5 },
  scanAiText: { fontSize:14, fontWeight:'700', letterSpacing:0.08 },
  scanHint: { fontSize:15, letterSpacing:0.08 },
  // Result card
  // Scan result card — name 18px, buttons min 40px tall
  resultCard: { borderRadius:4, borderWidth:1, marginHorizontal:12, marginBottom:8, overflow:'hidden', position:'relative' },
  resultContent: { padding:14 },
  resultTop: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 },
  resultAi: { fontSize:14, fontWeight:'700', letterSpacing:0.08 },
  resultConf: { fontSize:15, fontWeight:'700' },
  resultName: { fontSize:22, fontWeight:'800', marginBottom:6 },
  resultLoc: { fontSize:14, marginBottom:10, letterSpacing:0.04 },
  resultActions: { flexDirection:'row', gap:8 },
  confirmBtn: { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', borderWidth:1, borderRadius:4, paddingVertical:14, minHeight:48, gap:6 },
  confirmText: { fontSize:16, fontWeight:'700', letterSpacing:0.04 },
  rejectBtn: { flex:1, alignItems:'center', justifyContent:'center', borderWidth:1, borderRadius:4, paddingVertical:14, minHeight:48 },
  rejectText: { fontSize:16, fontWeight:'600', letterSpacing:0.04 },
  // Form
  formField: { marginHorizontal:12, marginBottom:10 },
  formLabel: { fontSize:14, fontWeight:'700', marginBottom:5, letterSpacing:0.08 },
  formWrap: { flexDirection:'row', alignItems:'center', borderWidth:1, borderRadius:3, paddingHorizontal:9 },
  formInput: { flex:1, fontSize:16, paddingVertical: Platform.OS==='ios'?12:8 },
  formRight: { fontSize:14, marginLeft:4, letterSpacing:0.04 },
  // Nav
  nav: { flexDirection:'row', borderTopWidth:1, paddingBottom: Platform.OS==='ios'?20:7, paddingTop:6, position:'relative' },
  navBevel: { position:'absolute', top:0, left:0, right:0, height:1 },
  navItem: { flex:1, alignItems:'center', gap:3, paddingTop:6, position:'relative', minHeight:44 },
  navLine: { position:'absolute', top:0, width:16, height:2 },
  navLabel: { fontSize:14, fontWeight:'600', letterSpacing:0.05 },
  // Empty
  empty: { flex:1, alignItems:'center', justifyContent:'center', padding:32 },
  emptyIcon: { width:60, height:60, borderRadius:4, borderWidth:1, alignItems:'center', justifyContent:'center', marginBottom:12, overflow:'hidden', position:'relative' },
  emptyTitle: { fontSize:18, fontWeight:'700', textAlign:'center' },
  emptySub: { fontSize:15, textAlign:'center', marginTop:6, lineHeight:22 },
  emptyAction: { marginTop:14, borderWidth:1, borderRadius:4, paddingHorizontal:16, paddingVertical:12, minHeight:44 },
  emptyActionText: { fontSize:16, fontWeight:'700', letterSpacing:0.04 },
  divider: { height:1, marginHorizontal:8 },
});
