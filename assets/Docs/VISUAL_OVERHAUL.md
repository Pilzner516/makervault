# MakerVault — Visual Overhaul Instructions

Read this entire file before touching any UI code. This is a complete visual overhaul — not a minor tweak.

---

## The problem to fix

The current UI has these specific issues, all of which must be resolved:

1. **Text is too small** — body text below 14px is unreadable in a workshop. Minimum 15px for item names, 22px for screen titles.
2. **No contrast** — everything is a similar shade of dark gray. We need clear hierarchy: screen bg vs card vs surface.
3. **Icons are unused or generic** — use `@expo/vector-icons` Ionicons throughout. Every nav item, every action button, every empty state needs a real icon.
4. **No wow factor** — the app needs to feel like a tool someone would be proud to use. Large amber numbers, bold typography, clear visual weight.
5. **Cramped layout** — rows are too tight. Increase all vertical padding.

---

## Step 1 — Install the UIKit

The file `components/UIKit.tsx` contains every component you need. **Do not recreate these inline.** Import from it everywhere:

```tsx
import {
  ScreenLayout, ScreenHeader, AlertBanner,
  StatStrip, StatTile, SectionLabel,
  ItemRow, Badge, MetricRow, MetricTile,
  FieldRow, ProjectCard, TagChip,
  SearchBar, FilterPillRow, FilterPill,
  LocationRow, PrimaryButton, SecondaryButton,
  ScanViewfinder, ScanResultCard, FormField,
  BottomNav, EmptyState, Divider,
  Colors, Spacing, FontSize, Radius
} from '@/components/UIKit';
```

---

## Step 2 — Rewrite every screen using UIKit components

Rewrite each screen completely. Do not patch the existing code — replace it.

### HomeScreen

```tsx
<ScreenLayout>
  <ScreenHeader
    title="MakerVault"
    subtitle="Workshop inventory"
    rightElement={<AddButton />}
  />
  <AlertBanner
    title="3 items need restocking"
    subtitle="Affects 5 active projects"
    variant="red"
    onPress={() => navigate('LowStock')}
  />
  <StatStrip>
    <StatTile value={247} label="Parts" onPress={() => navigate('Inventory')} />
    <StatTile value={12}  label="Projects" onPress={() => navigate('Projects')} />
    <StatTile value={3}   label="Low stock" color={Colors.statusOut} onPress={() => navigate('LowStock')} />
  </StatStrip>
  <ScrollView>
    <SectionLabel label="Low stock alerts" />
    <ItemRow iconLabel="M5" name="M5 Washers" meta="Bin A6" badge="out" onPress={...} />
    <ItemRow iconLabel="KEY" name="3mm Allen Key" meta="Tool wall" badge="low" badgeLabel="2 left" onPress={...} />
    <SectionLabel label="Recently added" />
    <ItemRow iconLabel="ARD" name="Arduino Nano v3" meta="Electronics shelf · 6" badge="ok" onPress={...} />
    <ItemRow iconLabel="PLA" name="PLA Filament 1kg" meta="Cabinet B · 12" badge="ok" onPress={...} />
  </ScrollView>
</ScreenLayout>
```

### InventoryScreen

```tsx
<ScreenLayout>
  <ScreenHeader title="Inventory" subtitle={`${count} items · ${locationCount} locations`} />
  <SearchBar value={search} onChangeText={setSearch} />
  <FilterPillRow>
    {categories.map(cat => (
      <FilterPill key={cat} label={cat} active={activeFilter === cat} onPress={() => setFilter(cat)} />
    ))}
  </FilterPillRow>
  <FlatList
    data={filteredItems}
    renderItem={({ item }) => (
      <ItemRow
        iconLabel={item.shortCode}
        name={item.name}
        meta={`${item.location} · ${item.quantity} ${item.unit}`}
        badge={item.quantity === 0 ? 'out' : item.quantity <= item.alertAt ? 'low' : 'ok'}
        onPress={() => navigate('ItemDetail', { id: item.id })}
      />
    )}
    ListEmptyComponent={<EmptyState icon="cube-outline" title="No items found" subtitle="Try a different filter or add your first item" />}
  />
</ScreenLayout>
```

### ItemDetailScreen

```tsx
<ScreenLayout>
  <ScreenHeader
    title={item.name}
    subtitle={`${item.category} · added ${item.dateAdded}`}
    backLabel={item.category}
    onBack={() => goBack()}
  />
  <ScrollView>
    <MetricRow>
      <MetricTile value={item.quantity} label="In stock" />
      <MetricTile value={item.alertAt}  label="Alert at" />
      <MetricTile value={item.projectCount} label="Projects" />
    </MetricRow>
    <SectionLabel label="Details" />
    <FieldRow label="Location" value={item.location} />
    <FieldRow label="Supplier" value={item.supplier} valueColor={Colors.amber} onPress={() => openLink(item.supplierUrl)} />
    <FieldRow label="Unit cost" value={`$${item.unitCost}`} />
    <FieldRow label="Last restocked" value={item.lastRestocked} />
    <SectionLabel label="Used in projects" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 12 }}>
      {item.projects.map(p => <TagChip key={p} label={p} color={Colors.amber} />)}
    </View>
    <PrimaryButton label="Add stock" icon="add-circle-outline" onPress={() => openAdjust('add')} />
    <SecondaryButton label="Remove / adjust count" onPress={() => openAdjust('remove')} />
  </ScrollView>
</ScreenLayout>
```

### ProjectsScreen

```tsx
<ScreenLayout>
  <ScreenHeader title="Projects" subtitle={`${projects.length} active builds`} rightElement={<NewProjectButton />} />
  <FlatList
    data={projects}
    contentContainerStyle={{ paddingTop: 8 }}
    renderItem={({ item }) => (
      <ProjectCard
        name={item.name}
        partsAvailable={item.partsAvailable}
        partsTotal={item.partsTotal}
        tags={item.topTags}
        onPress={() => navigate('ProjectDetail', { id: item.id })}
      />
    )}
    ListEmptyComponent={
      <EmptyState icon="construct-outline" title="No projects yet" subtitle="Create a project to track which parts you need" actionLabel="Create first project" onAction={() => navigate('NewProject')} />
    }
  />
</ScreenLayout>
```

### ScanScreen

```tsx
<ScreenLayout>
  <ScreenHeader title="Scan" subtitle="AI camera · barcode · voice" />
  <View style={{ flexDirection: 'row', gap: 6, padding: 12 }}>
    {['AI Identify', 'Barcode', 'Voice', 'Manual'].map(mode => (
      <FilterPill key={mode} label={mode} active={activeMode === mode} onPress={() => setMode(mode)} />
    ))}
  </View>
  <ScanViewfinder hint="Point at item or workspace" />
  {scanResult && (
    <ScanResultCard
      name={scanResult.name}
      confidence={scanResult.confidence}
      suggestedLocation={scanResult.location}
      onConfirm={() => navigate('AddItem', { prefilled: scanResult })}
      onReject={() => clearResult()}
    />
  )}
</ScreenLayout>
```

---

## Step 3 — Typography rules (enforce everywhere)

| Element          | fontSize | fontWeight | color                  |
|------------------|----------|------------|------------------------|
| Screen title     | 22px     | 700        | `#f0ede0`              |
| Item name        | 15px     | 600        | `#e0ddd0`              |
| Section label    | 10px     | 600        | `#555` uppercase       |
| Meta / sublabel  | 13px     | 400        | `#888`                 |
| Badge text       | 11px     | 600        | status color           |
| Stat number      | 28px     | 700        | `#f0a030`              |
| Metric number    | 22px     | 700        | `#f0a030`              |
| Field label      | 13px     | 400        | `#888`                 |
| Field value      | 13px     | 600        | `#e0ddd0`              |
| Button text      | 15px     | 700        | `#f0a030`              |
| Nav label        | 10px     | 500        | active: `#f0a030`      |

**Never use fontSize below 11px anywhere in the app.**

---

## Step 4 — Spacing rules (enforce everywhere)

- Screen horizontal padding: **12px minimum, always**
- List row vertical padding: **13px top and bottom** (not 8px)
- Icon box: **40×40px** (not 28×28)
- Stat tile: **12px vertical padding**
- Card padding: **14px**
- Gap between cards: **8px**
- Section label top margin: **16px**

---

## Step 5 — Icons (use Ionicons everywhere)

Replace all text-only buttons and nav items with icons. Required icon assignments:

| UI element         | Icon name (Ionicons)           |
|--------------------|-------------------------------|
| Home nav           | `home` / `home-outline`       |
| Inventory nav      | `cube` / `cube-outline`       |
| Projects nav       | `construct` / `construct-outline` |
| Scan nav           | `camera` / `camera-outline`   |
| Add button         | `add-circle-outline`          |
| Search             | `search-outline`              |
| Low stock warning  | `warning`                     |
| Location           | `location-outline`            |
| Settings           | `settings-outline`            |
| Delete             | `trash-outline`               |
| Edit               | `pencil-outline`              |
| AI / sparkle       | `sparkles`                    |
| Barcode            | `barcode-outline`             |
| Back arrow         | `chevron-back`                |
| Row chevron        | `chevron-forward`             |
| Empty state — inventory | `cube-outline`          |
| Empty state — projects  | `construct-outline`     |
| Empty state — scan      | `camera-outline`        |

---

## Step 6 — Do a pass on these specific things

After rewriting screens, check each of these:

- [ ] Stat numbers on HomeScreen are **28px bold amber** — visible from arm's length
- [ ] Every list row icon box is **40×40px** with a 3-letter abbreviation
- [ ] Bottom nav uses **Ionicons**, not text or emoji
- [ ] Active nav item has an **amber top bar** (2px, 20px wide, centered above icon)
- [ ] Alert banner on HomeScreen is **visible and tappable**, not just a colored strip
- [ ] All `<Text>` components have explicit `fontSize` — no inherited sizes
- [ ] `StatusBar` is set to `light-content` on every screen
- [ ] `backgroundColor: Colors.bgScreen` on every `<View>` that could show white flash during navigation
- [ ] Progress bars in ProjectCard are **4px tall**, not 2px
- [ ] Scan viewfinder frame is **200×200px** with amber corner markers

---

## What NOT to do

- Do not use `StyleSheet` inline colors — import from `Colors` in UIKit
- Do not create new badge or row components — use `Badge` and `ItemRow` from UIKit
- Do not use default React Native `<Button>` — use `PrimaryButton` or `SecondaryButton`
- Do not hardcode font sizes inline — use `FontSize.md` etc from UIKit
- Do not add light-colored backgrounds to any view
- Do not use emoji as icons in the nav bar
- Do not set `fontSize` below 11 anywhere
