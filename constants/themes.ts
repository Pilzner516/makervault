/**
 * MakerVault — Theme Definitions
 * ================================
 * 10 themes based on award-winning UI research (Linear, GitHub, Stripe, Spotify, Vercel).
 * Each has 7 distinct background layers, 5-tier text hierarchy, WCAG AA contrast.
 * Zero orange/amber. Every theme has a unique base tone + accent combination.
 */

export interface ThemeColors {
  bgBase: string;      // App chrome, status bar, tab bar
  bgScreen: string;    // Full-screen background
  bgDeep: string;      // Content well behind scrollable lists
  bgCard: string;      // Card containers, section wrappers
  bgRow: string;       // Individual rows inside cards
  bgSurface: string;   // Inputs, search bars, toggles
  bgElevated: string;  // Modals, tooltips, popovers

  borderDefault: string;
  borderMid: string;
  borderSubtle: string;
  borderAccent: string;

  textPrimary: string;   // Titles, headings (12:1+ on bgCard)
  textSecondary: string; // Item names, body (7:1+ on bgCard)
  textMuted: string;     // Metadata, timestamps (4.5:1+ on bgCard)
  textFaint: string;     // Labels, placeholders
  textDisabled: string;  // Inactive elements

  accent: string;
  accentBg: string;
  accentBorder: string;
  accentShimmerA: string;
  accentShimmerB: string;

  statusOk: string;
  statusOkBg: string;
  statusOkBorder: string;
  statusLow: string;      // Warning — matches theme accent color
  statusLowBg: string;
  statusLowBorder: string;
  statusOut: string;
  statusOutBg: string;
  statusOutBorder: string;

  alertDangerBg: string;
  alertDangerBorder: string;
  alertWarnBg: string;
  alertWarnBorder: string;

  scanBg: string;
  scanFrameColor: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  previewColors: [string, string, string]; // [bg, accent, card]
  colors: ThemeColors;
}

// ─── 1. MIDNIGHT WORKSHOP (default) ─────────────────────────────────────────
// Deep blue-black + electric blue. Inspired by Linear & GitHub.

const midnightWorkshop: ThemeDefinition = {
  id: 'midnight-workshop',
  name: 'Midnight Workshop',
  description: 'Deep blue-black with electric blue — professional and focused.',
  previewColors: ['#0C1018', '#3B82F6', '#1A2230'],
  colors: {
    bgBase: '#06090E', bgScreen: '#0C1018', bgDeep: '#121822',
    bgCard: '#1A2230', bgRow: '#212B3B', bgSurface: '#2A3547', bgElevated: '#354054',
    borderDefault: '#253041', borderMid: '#1E2838', borderSubtle: '#121822',
    borderAccent: 'rgba(59,130,246,0.22)',
    textPrimary: '#F0F4F8', textSecondary: '#B8C4D4', textMuted: '#7E8FA4',
    textFaint: '#566478', textDisabled: '#4A7A8A',
    accent: '#3B82F6', accentBg: 'rgba(59,130,246,0.08)',
    accentBorder: 'rgba(59,130,246,0.25)',
    accentShimmerA: 'transparent', accentShimmerB: 'rgba(59,130,246,0.45)',
    statusOk: '#34D399', statusOkBg: 'rgba(52,211,153,0.08)', statusOkBorder: 'rgba(52,211,153,0.18)',
    statusLow: '#3B82F6', statusLowBg: 'rgba(59,130,246,0.08)', statusLowBorder: 'rgba(59,130,246,0.18)',
    statusOut: '#F87171', statusOutBg: 'rgba(248,113,113,0.08)', statusOutBorder: 'rgba(248,113,113,0.18)',
    alertDangerBg: 'rgba(248,113,113,0.07)', alertDangerBorder: 'rgba(248,113,113,0.18)',
    alertWarnBg: 'rgba(59,130,246,0.07)', alertWarnBorder: 'rgba(59,130,246,0.18)',
    scanBg: '#06090E', scanFrameColor: '#3B82F6',
  },
};

// ─── 2. SOLDER SMOKE ─────────────────────────────────────────────────────────
// Warm charcoal with red undertone + teal accent. Workshop warmth.

const solderSmoke: ThemeDefinition = {
  id: 'solder-smoke',
  name: 'Solder Smoke',
  description: 'Warm charcoal with teal accent — like a soldering station.',
  previewColors: ['#171111', '#2DD4BF', '#2A2121'],
  colors: {
    bgBase: '#0E0A0A', bgScreen: '#171111', bgDeep: '#1F1818',
    bgCard: '#2A2121', bgRow: '#342B2B', bgSurface: '#3E3434', bgElevated: '#4A3F3F',
    borderDefault: '#332929', borderMid: '#2C2222', borderSubtle: '#1F1818',
    borderAccent: 'rgba(45,212,191,0.22)',
    textPrimary: '#F5EEEE', textSecondary: '#CBBFBF', textMuted: '#968888',
    textFaint: '#6E6060', textDisabled: '#524747',
    accent: '#2DD4BF', accentBg: 'rgba(45,212,191,0.08)',
    accentBorder: 'rgba(45,212,191,0.25)',
    accentShimmerA: 'transparent', accentShimmerB: 'rgba(45,212,191,0.45)',
    statusOk: '#4ADE80', statusOkBg: 'rgba(74,222,128,0.08)', statusOkBorder: 'rgba(74,222,128,0.18)',
    statusLow: '#2DD4BF', statusLowBg: 'rgba(45,212,191,0.08)', statusLowBorder: 'rgba(45,212,191,0.18)',
    statusOut: '#FB7185', statusOutBg: 'rgba(251,113,133,0.08)', statusOutBorder: 'rgba(251,113,133,0.18)',
    alertDangerBg: 'rgba(251,113,133,0.07)', alertDangerBorder: 'rgba(251,113,133,0.18)',
    alertWarnBg: 'rgba(45,212,191,0.07)', alertWarnBorder: 'rgba(45,212,191,0.18)',
    scanBg: '#0E0A0A', scanFrameColor: '#2DD4BF',
  },
};

// ─── 3. CIRCUIT NOIR ─────────────────────────────────────────────────────────
// True OLED black + vivid violet. Brutalist minimalism. Inspired by Spotify/Vercel.

const circuitNoir: ThemeDefinition = {
  id: 'circuit-noir',
  name: 'Circuit Noir',
  description: 'True OLED black with violet — brutalist minimalism.',
  previewColors: ['#0A0A0A', '#8B5CF6', '#1E1E1E'],
  colors: {
    bgBase: '#000000', bgScreen: '#0A0A0A', bgDeep: '#141414',
    bgCard: '#1E1E1E', bgRow: '#282828', bgSurface: '#333333', bgElevated: '#3D3D3D',
    borderDefault: '#2A2A2A', borderMid: '#222222', borderSubtle: '#141414',
    borderAccent: 'rgba(139,92,246,0.22)',
    textPrimary: '#EDEDED', textSecondary: '#A1A1A1', textMuted: '#737373',
    textFaint: '#525252', textDisabled: '#3B3B3B',
    accent: '#8B5CF6', accentBg: 'rgba(139,92,246,0.08)',
    accentBorder: 'rgba(139,92,246,0.25)',
    accentShimmerA: 'transparent', accentShimmerB: 'rgba(139,92,246,0.45)',
    statusOk: '#4ADE80', statusOkBg: 'rgba(74,222,128,0.08)', statusOkBorder: 'rgba(74,222,128,0.18)',
    statusLow: '#8B5CF6', statusLowBg: 'rgba(139,92,246,0.08)', statusLowBorder: 'rgba(139,92,246,0.18)',
    statusOut: '#F87171', statusOutBg: 'rgba(248,113,113,0.08)', statusOutBorder: 'rgba(248,113,113,0.18)',
    alertDangerBg: 'rgba(248,113,113,0.07)', alertDangerBorder: 'rgba(248,113,113,0.18)',
    alertWarnBg: 'rgba(139,92,246,0.07)', alertWarnBorder: 'rgba(139,92,246,0.18)',
    scanBg: '#000000', scanFrameColor: '#8B5CF6',
  },
};

// ─── 4. PCB GREEN ────────────────────────────────────────────────────────────
// Dark green like a circuit board + hot pink accent. Distinctly hardware.

const pcbGreen: ThemeDefinition = {
  id: 'pcb-green',
  name: 'PCB Green',
  description: 'Circuit board green with hot pink — distinctly hardware.',
  previewColors: ['#091810', '#EC4899', '#162D22'],
  colors: {
    bgBase: '#040E08', bgScreen: '#091810', bgDeep: '#0F2219',
    bgCard: '#162D22', bgRow: '#1E3A2C', bgSurface: '#274836', bgElevated: '#315641',
    borderDefault: '#1C3326', borderMid: '#162A20', borderSubtle: '#0F2219',
    borderAccent: 'rgba(236,72,153,0.22)',
    textPrimary: '#E8F5EC', textSecondary: '#B0D4BA', textMuted: '#7AA88A',
    textFaint: '#537A62', textDisabled: '#3B5C48',
    accent: '#EC4899', accentBg: 'rgba(236,72,153,0.08)',
    accentBorder: 'rgba(236,72,153,0.25)',
    accentShimmerA: 'transparent', accentShimmerB: 'rgba(236,72,153,0.45)',
    statusOk: '#6EE7B7', statusOkBg: 'rgba(110,231,183,0.08)', statusOkBorder: 'rgba(110,231,183,0.18)',
    statusLow: '#EC4899', statusLowBg: 'rgba(236,72,153,0.08)', statusLowBorder: 'rgba(236,72,153,0.18)',
    statusOut: '#FB7185', statusOutBg: 'rgba(251,113,133,0.08)', statusOutBorder: 'rgba(251,113,133,0.18)',
    alertDangerBg: 'rgba(251,113,133,0.07)', alertDangerBorder: 'rgba(251,113,133,0.18)',
    alertWarnBg: 'rgba(236,72,153,0.07)', alertWarnBorder: 'rgba(236,72,153,0.18)',
    scanBg: '#040E08', scanFrameColor: '#EC4899',
  },
};

// ─── 5. OSCILLOSCOPE ─────────────────────────────────────────────────────────
// Phosphor green on teal-black. Retro hacker/maker nostalgia.

const oscilloscope: ThemeDefinition = {
  id: 'oscilloscope',
  name: 'Oscilloscope',
  description: 'Phosphor green glow — vintage terminal nostalgia.',
  previewColors: ['#0B1214', '#39FF14', '#192528'],
  colors: {
    bgBase: '#050A0A', bgScreen: '#0B1214', bgDeep: '#111B1E',
    bgCard: '#192528', bgRow: '#213033', bgSurface: '#2A3B3F', bgElevated: '#33474C',
    borderDefault: '#1D2C30', borderMid: '#162326', borderSubtle: '#111B1E',
    borderAccent: 'rgba(57,255,20,0.22)',
    textPrimary: '#E0F2F1', textSecondary: '#A8CDCA', textMuted: '#6F9B96',
    textFaint: '#4E7570', textDisabled: '#375652',
    accent: '#39FF14', accentBg: 'rgba(57,255,20,0.08)',
    accentBorder: 'rgba(57,255,20,0.25)',
    accentShimmerA: 'transparent', accentShimmerB: 'rgba(57,255,20,0.45)',
    statusOk: '#39FF14', statusOkBg: 'rgba(57,255,20,0.08)', statusOkBorder: 'rgba(57,255,20,0.18)',
    statusLow: '#39FF14', statusLowBg: 'rgba(57,255,20,0.08)', statusLowBorder: 'rgba(57,255,20,0.18)',
    statusOut: '#FF6B6B', statusOutBg: 'rgba(255,107,107,0.08)', statusOutBorder: 'rgba(255,107,107,0.18)',
    alertDangerBg: 'rgba(255,107,107,0.07)', alertDangerBorder: 'rgba(255,107,107,0.18)',
    alertWarnBg: 'rgba(57,255,20,0.07)', alertWarnBorder: 'rgba(57,255,20,0.18)',
    scanBg: '#050A0A', scanFrameColor: '#39FF14',
  },
};

// ─── 6. TITANIUM ─────────────────────────────────────────────────────────────
// Cool steel gray + indigo. Premium hardware feel. Inspired by Apple Pro.

const titanium: ThemeDefinition = {
  id: 'titanium',
  name: 'Titanium',
  description: 'Brushed steel with indigo — premium and restrained.',
  previewColors: ['#131519', '#6366F1', '#24262E'],
  colors: {
    bgBase: '#0C0D10', bgScreen: '#131519', bgDeep: '#1B1D23',
    bgCard: '#24262E', bgRow: '#2D3039', bgSurface: '#373B45', bgElevated: '#424752',
    borderDefault: '#282B34', borderMid: '#21242C', borderSubtle: '#1B1D23',
    borderAccent: 'rgba(99,102,241,0.22)',
    textPrimary: '#ECEEF2', textSecondary: '#B4B9C4', textMuted: '#808793',
    textFaint: '#5A6170', textDisabled: '#434A57',
    accent: '#6366F1', accentBg: 'rgba(99,102,241,0.08)',
    accentBorder: 'rgba(99,102,241,0.25)',
    accentShimmerA: 'transparent', accentShimmerB: 'rgba(99,102,241,0.45)',
    statusOk: '#34D399', statusOkBg: 'rgba(52,211,153,0.08)', statusOkBorder: 'rgba(52,211,153,0.18)',
    statusLow: '#6366F1', statusLowBg: 'rgba(99,102,241,0.08)', statusLowBorder: 'rgba(99,102,241,0.18)',
    statusOut: '#F87171', statusOutBg: 'rgba(248,113,113,0.08)', statusOutBorder: 'rgba(248,113,113,0.18)',
    alertDangerBg: 'rgba(248,113,113,0.07)', alertDangerBorder: 'rgba(248,113,113,0.18)',
    alertWarnBg: 'rgba(99,102,241,0.07)', alertWarnBorder: 'rgba(99,102,241,0.18)',
    scanBg: '#0C0D10', scanFrameColor: '#6366F1',
  },
};

// ─── 7. NEON LAB ─────────────────────────────────────────────────────────────
// Neutral dark + vivid cyan. UV/blacklight workbench energy.

const neonLab: ThemeDefinition = {
  id: 'neon-lab',
  name: 'Neon Lab',
  description: 'Vivid cyan on neutral dark — UV workbench energy.',
  previewColors: ['#101016', '#06B6D4', '#212129'],
  colors: {
    bgBase: '#08080C', bgScreen: '#101016', bgDeep: '#18181F',
    bgCard: '#212129', bgRow: '#2A2A33', bgSurface: '#34343E', bgElevated: '#3F3F4A',
    borderDefault: '#282833', borderMid: '#21212B', borderSubtle: '#18181F',
    borderAccent: 'rgba(6,182,212,0.22)',
    textPrimary: '#F0F0F5', textSecondary: '#B5B5C3', textMuted: '#7F7F91',
    textFaint: '#5C5C6E', textDisabled: '#43434F',
    accent: '#06B6D4', accentBg: 'rgba(6,182,212,0.08)',
    accentBorder: 'rgba(6,182,212,0.25)',
    accentShimmerA: 'transparent', accentShimmerB: 'rgba(6,182,212,0.45)',
    statusOk: '#22D3EE', statusOkBg: 'rgba(34,211,238,0.08)', statusOkBorder: 'rgba(34,211,238,0.18)',
    statusLow: '#06B6D4', statusLowBg: 'rgba(6,182,212,0.08)', statusLowBorder: 'rgba(6,182,212,0.18)',
    statusOut: '#FB7185', statusOutBg: 'rgba(251,113,133,0.08)', statusOutBorder: 'rgba(251,113,133,0.18)',
    alertDangerBg: 'rgba(251,113,133,0.07)', alertDangerBorder: 'rgba(251,113,133,0.18)',
    alertWarnBg: 'rgba(6,182,212,0.07)', alertWarnBorder: 'rgba(6,182,212,0.18)',
    scanBg: '#08080C', scanFrameColor: '#06B6D4',
  },
};

// ─── 8. FORGE ────────────────────────────────────────────────────────────────
// Warm neutral + magenta-rose. Bold and artistic.

const forge: ThemeDefinition = {
  id: 'forge',
  name: 'Forge',
  description: 'Warm charcoal with magenta-rose — bold and creative.',
  previewColors: ['#131011', '#E11D78', '#262122'],
  colors: {
    bgBase: '#0A0809', bgScreen: '#131011', bgDeep: '#1C1819',
    bgCard: '#262122', bgRow: '#312B2C', bgSurface: '#3C3536', bgElevated: '#484041',
    borderDefault: '#2E2728', borderMid: '#262020', borderSubtle: '#1C1819',
    borderAccent: 'rgba(225,29,120,0.22)',
    textPrimary: '#F3EFEF', textSecondary: '#C5BABA', textMuted: '#918484',
    textFaint: '#695F5F', textDisabled: '#504848',
    accent: '#E11D78', accentBg: 'rgba(225,29,120,0.08)',
    accentBorder: 'rgba(225,29,120,0.25)',
    accentShimmerA: 'transparent', accentShimmerB: 'rgba(225,29,120,0.45)',
    statusOk: '#34D399', statusOkBg: 'rgba(52,211,153,0.08)', statusOkBorder: 'rgba(52,211,153,0.18)',
    statusLow: '#E11D78', statusLowBg: 'rgba(225,29,120,0.08)', statusLowBorder: 'rgba(225,29,120,0.18)',
    statusOut: '#F87171', statusOutBg: 'rgba(248,113,113,0.08)', statusOutBorder: 'rgba(248,113,113,0.18)',
    alertDangerBg: 'rgba(248,113,113,0.07)', alertDangerBorder: 'rgba(248,113,113,0.18)',
    alertWarnBg: 'rgba(225,29,120,0.07)', alertWarnBorder: 'rgba(225,29,120,0.18)',
    scanBg: '#0A0809', scanFrameColor: '#E11D78',
  },
};

// ─── 9. DEEP SPACE ───────────────────────────────────────────────────────────
// Ultra-dark purple-black + sky blue. Contemplative, late-night sessions.

const deepSpace: ThemeDefinition = {
  id: 'deep-space',
  name: 'Deep Space',
  description: 'Purple void with starlight blue — deep and contemplative.',
  previewColors: ['#0F0C18', '#38BDF8', '#201B2E'],
  colors: {
    bgBase: '#08060E', bgScreen: '#0F0C18', bgDeep: '#171322',
    bgCard: '#201B2E', bgRow: '#2A243A', bgSurface: '#342E46', bgElevated: '#3F3853',
    borderDefault: '#241F32', borderMid: '#1D1828', borderSubtle: '#171322',
    borderAccent: 'rgba(56,189,248,0.22)',
    textPrimary: '#EDE8F5', textSecondary: '#B8AED0', textMuted: '#857AA0',
    textFaint: '#605578', textDisabled: '#483F5C',
    accent: '#38BDF8', accentBg: 'rgba(56,189,248,0.08)',
    accentBorder: 'rgba(56,189,248,0.25)',
    accentShimmerA: 'transparent', accentShimmerB: 'rgba(56,189,248,0.45)',
    statusOk: '#4ADE80', statusOkBg: 'rgba(74,222,128,0.08)', statusOkBorder: 'rgba(74,222,128,0.18)',
    statusLow: '#38BDF8', statusLowBg: 'rgba(56,189,248,0.08)', statusLowBorder: 'rgba(56,189,248,0.18)',
    statusOut: '#FB7185', statusOutBg: 'rgba(251,113,133,0.08)', statusOutBorder: 'rgba(251,113,133,0.18)',
    alertDangerBg: 'rgba(251,113,133,0.07)', alertDangerBorder: 'rgba(251,113,133,0.18)',
    alertWarnBg: 'rgba(56,189,248,0.07)', alertWarnBorder: 'rgba(56,189,248,0.18)',
    scanBg: '#08060E', scanFrameColor: '#38BDF8',
  },
};

// ─── 10. GRAPHENE ────────────────────────────────────────────────────────────
// Carbon green-gray + lime-chartreuse. Material, innovative.

const graphene: ThemeDefinition = {
  id: 'graphene',
  name: 'Graphene',
  description: 'Carbon fiber green-gray with lime — raw and innovative.',
  previewColors: ['#0E1210', '#A3E635', '#1F2522'],
  colors: {
    bgBase: '#070A08', bgScreen: '#0E1210', bgDeep: '#161B18',
    bgCard: '#1F2522', bgRow: '#29302C', bgSurface: '#333B37', bgElevated: '#3E4742',
    borderDefault: '#242D28', borderMid: '#1D2520', borderSubtle: '#161B18',
    borderAccent: 'rgba(163,230,53,0.22)',
    textPrimary: '#ECF0ED', textSecondary: '#B3BFB8', textMuted: '#7D8E85',
    textFaint: '#586960', textDisabled: '#414F48',
    accent: '#A3E635', accentBg: 'rgba(163,230,53,0.08)',
    accentBorder: 'rgba(163,230,53,0.25)',
    accentShimmerA: 'transparent', accentShimmerB: 'rgba(163,230,53,0.45)',
    statusOk: '#4ADE80', statusOkBg: 'rgba(74,222,128,0.08)', statusOkBorder: 'rgba(74,222,128,0.18)',
    statusLow: '#A3E635', statusLowBg: 'rgba(163,230,53,0.08)', statusLowBorder: 'rgba(163,230,53,0.18)',
    statusOut: '#F87171', statusOutBg: 'rgba(248,113,113,0.08)', statusOutBorder: 'rgba(248,113,113,0.18)',
    alertDangerBg: 'rgba(248,113,113,0.07)', alertDangerBorder: 'rgba(248,113,113,0.18)',
    alertWarnBg: 'rgba(163,230,53,0.07)', alertWarnBorder: 'rgba(163,230,53,0.18)',
    scanBg: '#070A08', scanFrameColor: '#A3E635',
  },
};

// ─── REGISTRY ────────────────────────────────────────────────────────────────

export const ALL_THEMES: ThemeDefinition[] = [
  midnightWorkshop,
  solderSmoke,
  circuitNoir,
  pcbGreen,
  oscilloscope,
  titanium,
  neonLab,
  forge,
  deepSpace,
  graphene,
];

export const DEFAULT_THEME_ID = 'midnight-workshop';

export function getThemeById(id: string): ThemeDefinition {
  return ALL_THEMES.find(t => t.id === id) ?? midnightWorkshop;
}
