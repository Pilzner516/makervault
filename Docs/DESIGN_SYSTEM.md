# MakerVault — Design System Reference (Level 3: Machined Metal)

> Drop in `docs/`. Claude Code must read this fully before touching any UI.
> This is the single source of truth. Do not deviate from it.

---

## Visual identity

Every panel looks physically constructed — machined aluminium. Rivets in corners, bevel edges catching light, section labels stamped into steel. The colour palette is deep ocean-black with electric cyan. Sharp corners everywhere. No large border radii. No consumer-app softness.

**Golden rule: never dark text on a dark background. Check every pair.**

---

## Colour tokens

### Backgrounds (darkest → lightest)

| Token | Hex | Used for |
|---|---|---|
| `bgBase` | `#010407` | Notch bar, bottom nav background |
| `bgScreen` | `#04090c` | All screen backgrounds |
| `bgDeep` | `#08141e` | Header panel, search bar, secondary buttons, scan bg, icon boxes, metric tiles, mode buttons |
| `bgCard` | `#0c1e2e` | All panels / cards / list containers |
| `bgSurface` | `#08141e` | Same as bgDeep — inputs, icon boxes |
| `bgElevated` | `#1e3a50` | Hover states |

### Borders

| Token | Value | Used for |
|---|---|---|
| `borderBright` | `#2a5a7a` | Bevel top-edge peak colour |
| `borderDefault` | `#1e3a50` | All card/panel borders |
| `borderMid` | `#1a3040` | Icon box borders, rivet borders |
| `borderSubtle` | `#08141e` | Row dividers inside panels |

### Text — always verify contrast

| Token | Hex | Minimum sits on | Used for |
|---|---|---|---|
| `textPrimary` | `#e8f8fc` | bgDeep, bgCard | Screen titles, result names |
| `textSecondary` | `#a0d8e8` | bgCard, bgDeep | Item names, field values, form values |
| `textMuted` | `#3a7888` | bgCard, bgDeep | Meta info, field labels, placeholders |
| `textFaint` | `#2a6070` | bgCard only | Section label text, very secondary |
| `textDisabled` | `#1a3a48` | bgScreen only | Inactive nav items |

### Accent — cyan

| Token | Value |
|---|---|
| `accent` | `#00c8e8` |
| `accentBg` | `rgba(0,200,232,0.08)` |
| `accentBorder` | `rgba(0,200,232,0.25)` |
| `accentBevelPeak` | `#00c8e8` — used as centre of bevel gradient |
| `accentInset` | `rgba(0,200,232,0.05)` — subtle top-to-bottom tint inside tiles |
| `accentShimmerB` | `rgba(0,200,232,0.50)` — shimmer gradient peak |

### Status colours

| | Text | Background | Border |
|---|---|---|---|
| OK | `#32d47a` | `rgba(50,212,122,0.08)` | `rgba(50,212,122,0.18)` |
| Low | `#f0a030` | `rgba(240,160,48,0.08)` | `rgba(240,160,48,0.18)` |
| Out | `#f05032` | `rgba(240,80,50,0.08)` | `rgba(240,80,50,0.18)` |

### Left-edge status bar colours (on alert rows)
- Danger row: `#f05032` — 2px left bar
- Warning row: `#f0a030` — 2px left bar
- Normal row: transparent

### Location dot colours
| Location | Hex |
|---|---|
| Bin rack A | `#00c8e8` |
| Electronics shelf | `#38bdf8` |
| Tool wall | `#32d47a` |
| Cabinet B | `#a78bfa` |
| Bench drawer | `#3a7888` |

---

## Typography

| Element | Size | Weight | Colour | Notes |
|---|---|---|---|---|
| Screen title | 16–20px | 800 | `textPrimary` | |
| App name in header | 13px | 800 | `textPrimary` | 0.02em tracking |
| Header subtitle | 7px | 400 | `textFaint` | UPPERCASE 0.14em tracking |
| Item / row name | 12px | 700 | `textSecondary` | |
| Meta / sublabel | 8px | 400 | `textMuted` | UPPERCASE 0.05em tracking |
| Engraved section label | 7px | 700 | `textFaint` | UPPERCASE 0.14em tracking |
| Stat number | 20px | 800 | `accent` | tracking -0.5px, tabular-nums |
| Metric number | 16px | 800 | `accent` | |
| Field label | 8px | 600 | `textMuted` | UPPERCASE 0.06em tracking |
| Field value | 11px | 700 | `textSecondary` | |
| Badge | 7–8px | 700 | status colour | UPPERCASE 0.05em tracking |
| CTA primary | 11px | 800 | `accent` | UPPERCASE 0.05em tracking |
| CTA secondary | 9px | 700 | `textMuted` | UPPERCASE 0.05em tracking |
| Nav label | 7px | 400–600 | active: `accent` inactive: `textDisabled` | UPPERCASE 0.07em tracking |
| Back link | 7px | 700 | `accent` | UPPERCASE 0.10em tracking |
| Add button | 7px | 700 | `accent` | UPPERCASE 0.06em tracking |

**Minimum font size: 7px. Never go below.**

---

## Spacing

| | Value | Used for |
|---|---|---|
| Screen horizontal padding | 8px | All panels sit 8px from screen edge |
| Panel padding | 0 (rows handle own padding) | |
| Row padding | 9px vertical, 10px horizontal | |
| Header panel padding | 12px horizontal, 10–12px vertical | |
| Gap between panels | 6–7px | |
| Stat strip gap | 5px | |

---

## Border radius — SHARP everywhere

| Element | Radius |
|---|---|
| Panels / cards | 4px |
| Stat tiles / metric tiles | 3px |
| Badges | 2px |
| Buttons (CTA, mode, pill) | 2–3px |
| Icon boxes | 3px |
| Search bar | 3px |
| Logo box | 5px |
| Nav bar | 0 — completely flat |
| Scan frame | 6px |

Do NOT use 8px, 10px, 12px radius anywhere. Sharp corners are essential to the aesthetic.

---

## Level 3 signature details — apply to every screen

### 1. Panel bevel (top + bottom edge)

Every panel/card gets two pseudo-element lines:
- **Top edge**: gradient `#0e2030 → #2a5a7a → #00c8e8 → #2a5a7a → #0e2030` — simulates light hitting the top edge of machined metal
- **Bottom edge**: gradient `#0e2030 → #122030 → #0e2030` — shadow underneath

```tsx
// React Native — use LinearGradient from expo-linear-gradient
// Top bevel
<LinearGradient
  colors={['#0e2030', '#2a5a7a', '#00c8e8', '#2a5a7a', '#0e2030']}
  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1 }}
/>
// Bottom shadow
<LinearGradient
  colors={['#0e2030', '#122030', '#0e2030']}
  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1 }}
/>
```

Apply to: all panels, project cards, header panel, result card, CTA button.

### 2. Rivets — screwheads in panel corners

Four per panel. Each rivet is a small circle with a cross-mark and a faint cyan reflection dot.

```tsx
function Rivet({ top, bottom, left, right }: { top?:number; bottom?:number; left?:number; right?:number }) {
  return (
    <View style={[styles.rivet, { top, bottom, left, right }]}>
      {/* Horizontal slot */}
      <View style={styles.rivetSlotH} />
      {/* Vertical slot */}
      <View style={styles.rivetSlotV} />
      {/* Cyan reflection */}
      <View style={styles.rivetGlow} />
    </View>
  );
}

// styles:
rivet: { position:'absolute', width:5, height:5, borderRadius:3, backgroundColor:'#08141e', borderWidth:1, borderColor:'#1a3040' },
rivetSlotH: { position:'absolute', top:'50%', left:1, right:1, height:0.5, backgroundColor:'rgba(0,200,232,0.2)', marginTop:-0.25 },
rivetSlotV: { position:'absolute', left:'50%', top:1, bottom:1, width:0.5, backgroundColor:'rgba(0,200,232,0.2)', marginLeft:-0.25 },
rivetGlow: { position:'absolute', top:0.5, left:0.5, width:2, height:2, borderRadius:1, backgroundColor:'rgba(0,200,232,0.15)' },
```

Place at: `top:5, left:5` / `top:5, right:5` / `bottom:5, left:5` / `bottom:5, right:5` inside every panel.

### 3. Engraved section labels

Section headers have horizontal lines extending left and right, like text stamped into metal.

```tsx
function EngravingLabel({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.engRow}>
      <View style={[styles.engLine, { backgroundColor: colors.borderDefault }]} />
      <Text style={[styles.engText, { color: colors.textFaint }]}>{label.toUpperCase()}</Text>
      <View style={[styles.engLineRight, { backgroundColor: colors.borderDefault }]} />
    </View>
  );
}

// styles:
engRow: { flexDirection:'row', alignItems:'center', paddingHorizontal:8, paddingTop:7, paddingBottom:3 },
engLine: { width:10, height:1, marginRight:6 },
engLineRight: { flex:1, height:1, marginLeft:6, opacity:0.5 },
engText: { fontSize:7, fontWeight:'700', letterSpacing:0.14 },
```

### 4. Inset tint on stat tiles and CTA buttons

A very subtle top-to-bottom gradient inside tiles — `rgba(0,200,232,0.05)` to transparent — makes them feel physically recessed.

```tsx
<LinearGradient
  colors={['rgba(0,200,232,0.06)', 'transparent']}
  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
  style={StyleSheet.absoluteFill}
/>
```

Apply inside: stat tiles, metric tiles, CTA primary button.

### 5. Left-edge status bar on rows

Alert and warning rows get a 2px coloured left border — not a badge replacement, but an additional signal.

```tsx
// On the row View:
<View style={[
  styles.row,
  status === 'out'  && { borderLeftWidth: 2, borderLeftColor: colors.statusOut },
  status === 'low'  && { borderLeftWidth: 2, borderLeftColor: colors.statusLow },
]} />
```

### 6. Grid texture in scan viewfinder

Faint repeating grid lines inside the scan frame — like a targeting overlay.

```tsx
// Render a grid of thin lines inside the scan frame
// Horizontal lines every 20px, vertical lines every 20px
// Color: rgba(0,200,232,0.04) — barely visible
```

### 7. Header panel treatment

The top header of every screen gets special treatment:
- Background: `bgDeep` (#08141e) — darker than the screen
- **2px top border** using the full bevel gradient (brighter than card bevel)
- Secondary shimmer line 1px below the top border at 20% opacity
- Bottom border: `borderDefault` 1px

---

## Components

All live in `components/UIKit.tsx`. Never recreate inline.

### PanelCard (replaces ListContainer)
```
bgCard bg · borderDefault 1px · 4px radius · overflow hidden
Top bevel gradient · Bottom shadow gradient
4 rivets at corners (5px from each edge)
```

### HeaderPanel
```
bgDeep bg · 2px top bevel (brighter) · borderDefault 1px bottom
Logo row: 26×26 logo box (bgScreen bg, borderDefault 1px, 5px radius) + name/sub + Add button
Stat strip inside header (3 tiles, 5px gap)
```

### EngravingLabel (replaces SectionHeader)
```
Line — UPPERCASE TEXT 7px/700/textFaint — line (fades right)
```

### Row (inside PanelCard)
```
bgDeep bg · borderSubtle 1px bottom · last row no border
Left status bar: 2px, statusOut or statusLow colour
34×34 icon box: bgSurface bg, borderMid 1px, 3px radius
  Icon box top shimmer: rgba(0,200,232,0.15) 1px
Name: 12px/700/textSecondary
Meta: 8px/textMuted/UPPERCASE
Badge: right-aligned
```

### StatTile
```
bgDeep bg · borderDefault 1px · 3px radius · overflow hidden
Top bevel · Inset tint gradient
Number: 20px/800/accent · Label: 7px/textFaint/UPPERCASE
```

### MetricTile
```
bgSurface bg · borderDefault 1px · 3px radius · overflow hidden
Top bevel · Inset tint gradient
Number: 16px/800/accent · Label: 7px/textFaint/UPPERCASE
```

### ProjectCard
```
bgCard bg · borderDefault 1px · 4px radius · overflow hidden
Top bevel · Left edge: rgba(0,200,232,0.35) 1px vertical line
4 rivets · Name/meta/tags/progress
Progress track: bgDeep · 3px height · grid texture overlay
```

### CTA Primary
```
bgDeep bg · borderDefault 1px · 3px radius
Top bevel · Inset tint gradient
Text: 11px/800/accent/UPPERCASE
```

### CTA Secondary
```
bgDeep bg · borderDefault 1px · 3px radius
Text: 9px/700/textMuted/UPPERCASE
```

### SearchBar
```
bgDeep bg · borderDefault 1px · 3px radius
Custom crosshair search icon (circle + cross lines in textMuted)
```

### FilterPill / ModeButton
```
Default: bgDeep bg · borderDefault 1px · 2px radius · textMuted/UPPERCASE
Active: accentBg · accentBorder · accent text
```

### Badge
```
2px radius · 7–8px/700/UPPERCASE
OK: statusOkBg / statusOk / statusOkBorder 1px
Low: statusLowBg / statusLow / statusLowBorder 1px
Out: statusOutBg / statusOut / statusOutBorder 1px
```

### AlertBanner
```
bgDeep bg · 2px top border in statusOut colour · borderSubtle bottom
Left indicator bar: 4px wide, statusOut colour
Title: 10px/700/statusOut · Sub: 8px/rgba(240,80,50,0.5)
```

### BottomNav
```
bgBase bg · borderDefault 1px top · bevel top gradient
Active: accent + 2px top bar (16px wide)
Inactive: textDisabled
7px/UPPERCASE/0.07em tracking · Ionicons 20px
```

### ScanViewfinder
```
bgDeep background
Frame: 130–150px square · scanFrameColor 1.5px · 6px radius
Grid texture inside: rgba(0,200,232,0.04) lines every 20px
Corner markers: 2.5px · 14px each
AI badge: accentBg · accentBorder · accent text · 2px radius · UPPERCASE
```

### LocationRow
```
bgDeep bg · borderSubtle 1px bottom
Dot: 10px circle · Name: 13px/700/textSecondary · Meta: 8px/textMuted
Count: bgCard bg · borderMid 1px · 2px radius
```

---

## Screen inventory

| Screen | Tab |
|---|---|
| Home | Home |
| Inventory | Inventory |
| Item Detail | Inventory |
| Projects | Projects |
| Project Detail | Projects |
| Scan | Scan |
| Add Item | Scan |
| Locations | Inventory |
| Low Stock | Home |
| Settings | Settings |

---

## Contrast rules — non-negotiable

| Background | Min text colour | Never |
|---|---|---|
| bgScreen #04090c | textMuted #3a7888 | textFaint, textDisabled |
| bgDeep #08141e | textMuted #3a7888 | textFaint, textDisabled |
| bgCard #0c1e2e | textMuted #3a7888 | textFaint, textDisabled |
| Rows in panels | textSecondary #a0d8e8 min | textMuted alone is marginal |
| Badge backgrounds | matching status colour | black, white, textPrimary |
| accentBg CTA | accent #00c8e8 | textPrimary, white |

---

## Do / don't

| Do | Don't |
|---|---|
| `colors.X` from `useTheme()` everywhere | Hardcode any hex value |
| Bevel on every panel and card | Skip bevel — it's the signature detail |
| Rivets in every panel corner | Forget rivets on any card |
| EngravingLabel for all section headers | Use plain Text for section labels |
| Left-edge bar on out/low rows | Only use badge — bar is required too |
| 2–4px radius everywhere | Use 8px+ radius anywhere |
| UPPERCASE on labels, nav, badges, meta | Mixed case on UI labels |
| Sharp corners on badges (2px) | Pill-shaped badges |
| Grid texture in scan viewfinder | Plain empty viewfinder |
| Ionicons for all icons | Emoji or text as icons |
| `bgDeep` for icon boxes, inputs, metric tiles | `bgCard` for these — too light |
| 4 nav items max | 5th tab |
| `StatusBar barStyle="light-content"` | Forget StatusBar |
| `bgScreen` on every root View | Unset backgrounds (white flash) |
