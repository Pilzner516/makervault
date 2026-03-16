# MakerVault — Complete Visual Overhaul Instructions

Read `docs/DESIGN_SYSTEM.md` fully before doing anything else.
This document tells you exactly what to do to every screen. Follow it precisely.

---

## What we are doing

We are upgrading every single screen in the app to Level 3: Machined Metal.
This means every screen gets:
- Riveted steel panels instead of plain cards
- Bevel edge lines on every panel top and bottom
- Engraved section labels with flanking lines
- Left-edge coloured status bars on alert rows
- Larger, readable fonts throughout
- Correct contrast on every text element — no dark text on dark backgrounds

This is not optional for individual screens. Every screen gets all of these changes.

---

## Step 1 — Install dependencies

Run this first if not already installed:
```
npx expo install expo-linear-gradient
```

---

## Step 2 — Replace these files completely

The following files have already been replaced with new versions. Do not modify them, just use them:
- `components/UIKit.tsx` — all Level 3 components live here
- `constants/themes.ts` — all colour tokens live here
- `docs/DESIGN_SYSTEM.md` — the full design spec

---

## Step 3 — The Level 3 component rules

Every screen must use ONLY these components from `@/components/UIKit`.
Never recreate them inline. Never use plain `<View>` for cards or `<Text>` for section labels.

### Cards / panels
```tsx
// WRONG — plain View
<View style={{ backgroundColor: '#0c1e2e', borderRadius: 8 }}>

// RIGHT — PanelCard (has bevel, rivets, correct bg)
import { PanelCard } from '@/components/UIKit';
<PanelCard>
  {/* rows go directly inside */}
</PanelCard>
```

### Section labels
```tsx
// WRONG — plain Text
<Text style={{ color: '#888', fontSize: 10 }}>Low stock</Text>

// RIGHT — EngravingLabel (has flanking lines, correct style)
import { EngravingLabel } from '@/components/UIKit';
<EngravingLabel label="Low stock" />
// With a right-side action:
<EngravingLabel label="Low stock" action="View all" onAction={() => navigate('LowStock')} />
```

### Screen headers
```tsx
// Home screen — use LogoHeader
import { LogoHeader, AddButton } from '@/components/UIKit';
<LogoHeader
  subtitle="Workshop OS"
  rightElement={<AddButton onPress={() => navigate('AddItem')} />}
/>

// All other screens — use ScreenHeader
import { ScreenHeader } from '@/components/UIKit';
<ScreenHeader
  title="Inventory"
  subtitle="247 items · 6 locations"
/>

// Detail screens with back button
<ScreenHeader
  title="M3 Hex Bolts"
  subtitle="Fasteners · Dec 2024"
  backLabel="Fasteners"
  onBack={() => goBack()}
/>
```

### List rows — CRITICAL: status prop required
```tsx
import { ItemRow } from '@/components/UIKit';

// Out of stock — red left bar
<ItemRow
  iconLabel="M5"
  name="M5 Washers"
  meta="Bin A6 · 0 left"
  badge="out"
  status="out"
  onPress={() => navigate('ItemDetail', { id: item.id })}
/>

// Low stock — amber left bar
<ItemRow
  iconLabel="SOL"
  name="Solder Wire"
  meta="Bench drawer · 1 left"
  badge="low"
  badgeLabel="1 left"
  status="low"
  onPress={() => navigate('ItemDetail', { id: item.id })}
/>

// Normal stock — no left bar
<ItemRow
  iconLabel="ARD"
  name="Arduino Nano v3"
  meta="Electronics shelf · 6"
  badge="ok"
  status="none"
  onPress={() => navigate('ItemDetail', { id: item.id })}
/>
```

### Stats strip (home screen)
```tsx
import { StatStrip, StatTile } from '@/components/UIKit';
<StatStrip>
  <StatTile value={247} label="Parts" onPress={() => navigate('Inventory')} />
  <StatTile value={12}  label="Projects" onPress={() => navigate('Projects')} />
  <StatTile value={3}   label="Alerts" color={colors.statusOut} onPress={() => navigate('LowStock')} />
</StatStrip>
```

### Metrics (detail screens)
```tsx
import { MetricRow, MetricTile } from '@/components/UIKit';
<MetricRow>
  <MetricTile value={48} label="In stock" />
  <MetricTile value={10} label="Alert at" />
  <MetricTile value={4}  label="Projects" />
</MetricRow>
```

### Field rows (detail screens)
```tsx
import { FieldRow } from '@/components/UIKit';
<FieldRow label="Location" value="Bin A4" />
<FieldRow label="Supplier" value="BoltBase UK" valueColor={colors.accent} onPress={() => openLink(url)} />
<FieldRow label="Unit cost" value="$0.08" />
<FieldRow label="Last restocked" value="Jan 2025" isLast />
```

### Project cards
```tsx
import { ProjectCard } from '@/components/UIKit';
<ProjectCard
  name="CNC Router Upgrade"
  partsAvailable={8}
  partsTotal={14}
  tags={['Stepper motors', 'NEMA 17']}
  onPress={() => navigate('ProjectDetail', { id: project.id })}
/>
```

### Buttons
```tsx
import { PrimaryButton, SecondaryButton } from '@/components/UIKit';
<PrimaryButton label="Add stock" icon="add-circle-outline" onPress={handleAdd} />
<SecondaryButton label="Remove / adjust count" onPress={handleRemove} />
```

### Alert banner
```tsx
import { AlertBanner } from '@/components/UIKit';
<AlertBanner
  title="3 items need restocking"
  subtitle="Affects 5 active projects"
  variant="danger"
  onPress={() => navigate('LowStock')}
/>
```

### Search bar
```tsx
import { SearchBar } from '@/components/UIKit';
<SearchBar
  value={searchQuery}
  onChangeText={setSearchQuery}
  placeholder="Search parts…"
/>
```

### Filter pills
```tsx
import { FilterPillRow, FilterPill } from '@/components/UIKit';
<FilterPillRow>
  {categories.map(cat => (
    <FilterPill
      key={cat}
      label={cat}
      active={activeFilter === cat}
      onPress={() => setActiveFilter(cat)}
    />
  ))}
</FilterPillRow>
```

### Scan screen
```tsx
import { ScanViewfinder, ScanResultCard, ModeButton } from '@/components/UIKit';

// Mode switcher row
<View style={{ flexDirection: 'row', gap: 4, padding: 8 }}>
  {['AI Identify', 'Barcode', 'Voice', 'Manual'].map(mode => (
    <ModeButton
      key={mode}
      label={mode}
      active={activeMode === mode}
      onPress={() => setActiveMode(mode)}
    />
  ))}
</View>

// Viewfinder
<ScanViewfinder hint="Point at item or workspace" />

// Result card (show when AI returns a result)
{scanResult && (
  <ScanResultCard
    name={scanResult.name}
    confidence={scanResult.confidence}
    suggestedLocation={scanResult.location}
    onConfirm={() => navigate('AddItem', { prefilled: scanResult })}
    onReject={clearResult}
  />
)}
```

### Bottom nav
```tsx
import { BottomNav } from '@/components/UIKit';
<BottomNav
  activeKey="home"  // 'home' | 'inventory' | 'projects' | 'scan'
  onNavigate={(key) => router.push(key)}
/>
```

### Locations screen
```tsx
import { LocationRow } from '@/components/UIKit';
// Use colors from useTheme() for dot colours
const { colors } = useTheme();
<LocationRow name="Bin rack A"       meta="6 bins · fasteners"    count={280} dotColor={colors.locBinA}        onPress={...} />
<LocationRow name="Electronics shelf" meta="3 sections"           count={62}  dotColor={colors.locElectronics}  onPress={...} />
<LocationRow name="Tool wall"         meta="Pegboard · hand tools" count={31}  dotColor={colors.locToolWall}     onPress={...} />
<LocationRow name="Cabinet B"         meta="3D printing supplies"  count={27}  dotColor={colors.locCabinetB}     onPress={...} />
<LocationRow name="Bench drawer"      meta="Consumables"           count={8}   dotColor={colors.locBench}  isLast onPress={...} />
```

### Empty states
```tsx
import { EmptyState } from '@/components/UIKit';
<EmptyState
  icon="cube-outline"
  title="No items found"
  subtitle="Try a different filter or add your first item"
  actionLabel="Add item"
  onAction={() => navigate('AddItem')}
/>
```

### Form fields (Add Item screen)
```tsx
import { FormField } from '@/components/UIKit';
<FormField label="Item name"   value={name}     onChangeText={setName}     placeholder="e.g. M3 Hex Bolts" />
<FormField label="Category"    value={category} onChangeText={setCategory} />
<FormField label="Quantity"    value={qty}      onChangeText={setQty}      keyboardType="numeric" rightLabel="pcs" />
<FormField label="Alert at"    value={alert}    onChangeText={setAlert}    keyboardType="numeric" rightLabel="pcs" />
<FormField label="Location"    value={location} onChangeText={setLocation} />
<FormField label="Supplier"    value={supplier} onChangeText={setSupplier} placeholder="Optional" />
<FormField label="Unit cost"   value={cost}     onChangeText={setCost}     keyboardType="decimal-pad" rightLabel="$" />
```

---

## Step 4 — Font size rules (enforce on every screen)

The previous implementation had text that was too small. These are the minimum sizes:

| Element | Minimum size | Weight |
|---|---|---|
| Screen title | 16px | 800 |
| Item / row name | 12px | 700 |
| Meta / sublabel | 8px | 400 |
| Stat numbers | 20px | 800 |
| Metric numbers | 16px | 800 |
| Field labels | 8px | 600 |
| Field values | 11px | 700 |
| Badge text | 7px | 700 |
| CTA button text | 11px | 800 |
| Nav labels | 7px | 500 |
| Section labels | 7px | 700 |

**Never use fontSize below 7px anywhere in the app.**
**The UIKit components already enforce these sizes — do not override them.**

---

## Step 5 — Contrast rules (enforce on every screen)

This is the most important fix. Check every text element against what is behind it.

| Background colour | Text colours that ARE allowed | Text colours NEVER allowed |
|---|---|---|
| `#010407` bgBase | `#3a7888` or lighter | `#2a6070`, `#1a3a48`, `#08141e` |
| `#04090c` bgScreen | `#3a7888` or lighter | `#2a6070`, `#1a3a48` |
| `#08141e` bgDeep | `#3a7888` or lighter | `#2a6070`, `#1a3a48` |
| `#0c1e2e` bgCard | `#3a7888` or lighter | `#1a3a48` |
| Badge backgrounds | Only the matching status colour | Never black, white, or textPrimary |
| Cyan accentBg | Only `#00c8e8` accent | Never textPrimary or white |

**Simple rule: if you can't clearly read it at arm's length, it is too dark. Make it lighter.**

The UIKit components handle contrast automatically. The problem only occurs when you:
1. Write inline `style={{ color: ... }}` instead of using UIKit components
2. Override UIKit component styles
3. Create custom components without checking contrast

Do not do any of these things. Use UIKit components everywhere.

---

## Step 6 — Colours must come from useTheme()

Every colour in every screen must come from `useTheme()`. Zero hardcoded hex values.

```tsx
// WRONG
<Text style={{ color: '#3a7888' }}>

// RIGHT
const { colors } = useTheme();
<Text style={{ color: colors.textMuted }}>
```

The only exception is inside `UIKit.tsx` itself and `VaultSplash.tsx` — those files have intentional hardcoded values for the bevel gradients.

---

## Step 7 — Do this screen by screen

Work through every screen in this order. Show me the result after each one before moving on:

1. **HomeScreen** — `app/(tabs)/index.tsx`
2. **InventoryScreen** — `app/(tabs)/inventory.tsx` (or similar)
3. **ItemDetailScreen** — item detail screen
4. **ProjectsScreen** — `app/(tabs)/projects.tsx` (or similar)
5. **ProjectDetailScreen** — project detail screen
6. **ScanScreen** — `app/(tabs)/scan.tsx` (or similar)
7. **AddItemScreen** — add item form
8. **LocationsScreen** — `app/locations.tsx`
9. **SettingsScreen** — `app/modal.tsx` — add `<ThemePicker />` here
10. **Any remaining screens** — apply same rules

For each screen:
- Replace the entire StyleSheet with `useTheme()` colour tokens
- Replace all card Views with `<PanelCard>`
- Replace all section labels with `<EngravingLabel>`
- Replace the header with `<LogoHeader>` or `<ScreenHeader>`
- Replace the bottom nav with `<BottomNav activeKey="..." onNavigate={...} />`
- Add `status` prop to every `<ItemRow>`
- Check every text colour for contrast
- Check every font size is at or above minimums

---

## Step 8 — What NOT to do

- Do not use `StyleSheet.create` for colours — only for layout (padding, margin, flex, width, height)
- Do not hardcode any hex colour value in any screen file
- Do not use `borderRadius` above 4px on any card or panel
- Do not use `borderRadius` above 2px on any badge
- Do not skip rivets or bevel — `PanelCard` handles these automatically, just use it
- Do not create a new badge component — use `<Badge>` from UIKit
- Do not use emoji as icons — use Ionicons names
- Do not put 5 items in the bottom nav — exactly 4: Home, Inventory, Projects, Scan
- Do not use font size below 7px
- Do not override UIKit component styles with inline styles

---

## Checklist before calling a screen done

For each screen, confirm all of these before moving on:

- [ ] Header uses `<LogoHeader>` or `<ScreenHeader>` from UIKit
- [ ] All cards use `<PanelCard>` — no plain View cards
- [ ] All section labels use `<EngravingLabel>` — no plain Text labels
- [ ] All list rows use `<ItemRow>` with correct `status` prop
- [ ] Bottom nav uses `<BottomNav>` from UIKit
- [ ] All colours come from `useTheme()` — no hardcoded hex
- [ ] All stat numbers are at least 20px
- [ ] All item names are at least 12px
- [ ] All text is readable — no dark text on dark backgrounds
- [ ] No border radius above 4px on cards
- [ ] No border radius above 2px on badges
- [ ] All labels, badges, nav items are UPPERCASE
