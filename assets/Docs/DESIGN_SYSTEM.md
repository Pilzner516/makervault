# MakerVault — Design System Reference

> Drop this file in your `docs/` folder. Claude Code should read it before building any UI screen or component.

---

## Visual identity

**Theme:** Dark industrial. No light mode. The app lives in workshops — dark is the right default.  
**Personality:** Utilitarian, high-contrast, fast to scan. Amber accents feel like warning lights and status LEDs. Every screen should feel like a tool, not a consumer app.

---

## Color tokens

### Backgrounds (darkest → lightest)

| Token name         | Hex       | Usage                                      |
|--------------------|-----------|--------------------------------------------|
| `bg-base`          | `#0a0a0a` | Notch bar, bottom nav bar                  |
| `bg-screen`        | `#161616` | All screen backgrounds                     |
| `bg-card`          | `#1e1e1e` | List rows, project cards, metric tiles     |
| `bg-surface`       | `#252525` | Icon boxes, input fields, filter pills     |
| `bg-elevated`      | `#2e2e2e` | Hover states, active inputs                |

### Borders

| Token name         | Hex       | Usage                                      |
|--------------------|-----------|--------------------------------------------|
| `border-default`   | `#2a2a2a` | Card borders, row dividers                 |
| `border-subtle`    | `#1e1e1e` | Section dividers, very subtle separators   |
| `border-emphasis`  | `#333333` | Icon box borders, elevated surfaces        |

### Text

| Token name         | Hex       | Usage                                      |
|--------------------|-----------|--------------------------------------------|
| `text-primary`     | `#f0ede0` | Item names, screen titles, form values     |
| `text-secondary`   | `#e0ddd0` | Row names, card titles                     |
| `text-muted`       | `#888888` | Meta info, locations, dates                |
| `text-faint`       | `#666666` | Section labels, field labels               |
| `text-ghost`       | `#555555` | Placeholder text, empty states             |
| `text-disabled`    | `#3a3a3a` | Inactive nav items                         |

### Accent — amber (primary)

| Token name         | Hex       | Usage                                      |
|--------------------|-----------|--------------------------------------------|
| `amber-500`        | `#f0a030` | Primary CTA buttons, active nav, stat numbers, AI confidence |
| `amber-bg`         | `rgba(240,160,48,0.12)` | Active pill backgrounds, CTA button fill  |
| `amber-border`     | `#634010` | Active pill/button borders                 |
| `amber-deep`       | `#854f0b` | Pressed states                             |

### Status colors

| Token name         | Hex       | Usage                                      |
|--------------------|-----------|--------------------------------------------|
| `status-ok`        | `#32b464` | In stock, project ready, success           |
| `status-ok-bg`     | `rgba(50,180,100,0.10)` | OK badge background                       |
| `status-low`       | `#f0a030` | Low stock warning (same as amber)          |
| `status-low-bg`    | `rgba(240,160,48,0.12)` | Low badge background                      |
| `status-out`       | `#f05032` | Out of stock, missing parts, error         |
| `status-out-bg`    | `rgba(240,80,50,0.13)`  | Out/error badge background                |

### Accent — locations (optional, for location dot colors)

| Location           | Hex       |
|--------------------|-----------|
| Bin rack A         | `#f0a030` |
| Electronics shelf  | `#378add` |
| Tool wall          | `#32b464` |
| Cabinet B          | `#aa7aff` |
| Bench drawer       | `#888888` |

---

## Typography

| Role               | Size  | Weight | Color          |
|--------------------|-------|--------|----------------|
| Screen title       | 18px  | 600    | `#f0ede0`      |
| Card / item name   | 12px  | 500    | `#e0ddd0`      |
| Section label      | 9px   | 500    | `#555` uppercase + 0.06em tracking |
| Meta / sublabel    | 9–10px| 400    | `#888`         |
| Field label        | 9px   | 400    | `#666`         |
| Badge text         | 8–9px | 500    | see status colors |
| Form input value   | 11px  | 400    | `#e0ddd0`      |

**Font:** System default (`-apple-system` / `Inter` fallback). No custom fonts needed — the dark palette does the heavy lifting.

---

## Spacing

| Token        | Value  | Usage                                   |
|--------------|--------|-----------------------------------------|
| `space-xs`   | 4px    | Badge padding, tight gaps               |
| `space-sm`   | 8px    | Row internal padding, icon gap          |
| `space-md`   | 12px   | Screen horizontal padding (all screens) |
| `space-lg`   | 16px   | Section gap, card gap                   |
| `space-xl`   | 24px   | Top-of-screen header padding            |

**Rule:** All screens use 12px horizontal padding consistently. Never go below 12px from screen edge.

---

## Border radius

| Token        | Value  | Usage                                   |
|--------------|--------|-----------------------------------------|
| `radius-sm`  | 4px    | Badges, pills                           |
| `radius-md`  | 7–8px  | Inputs, icon boxes, mode buttons        |
| `radius-lg`  | 10–12px| Project cards, result cards, stat tiles |
| `radius-pill`| 20px   | FAB buttons, tag chips                  |
| `radius-phone`| 28px  | Phone frame (for mockups only)          |

---

## Components

### Bottom nav bar

- 4 tabs: **Home · Inventory · Projects · Scan**
- Background: `#0e0e0e`
- Border top: `0.5px solid #1e1e1e`
- Inactive: `#3a3a3a` text + icon
- Active: `#f0a030` text + 2px amber underbar (`width: 14px`, centered)
- Font size: 8px
- Padding: 5–6px vertical

### Status badges

```
OK      → bg: rgba(50,180,100,0.10)   text: #32b464   border: none
Low     → bg: rgba(240,160,48,0.12)   text: #f0a030   border: none
Out     → bg: rgba(240,80,50,0.13)    text: #f05032   border: none
Ready   → same as OK
Missing → same as Out
```

- Font: 8–9px, weight 500
- Padding: 2px 6px
- Border radius: 4px
- Always right-aligned in list rows

### List row

```
[28×28 icon box]  [name 12px/500 + meta 9px/#888]  [badge or count]
```

- Height: ~44px
- Padding: 8px 12px
- Border bottom: `0.5px solid #1e1e1e`
- Icon box: `#212121` bg, `0.5px solid #2e2e2e` border, `border-radius: 7px`
- Icon text: 10–11px, `#888`, weight 500 (abbreviation e.g. "M3", "ARD", "LED")

### Stat tile (home screen strip)

```
[number 16px/#f0a030/600]
[label 8px/#666]
```

- Background: `#1e1e1e`
- Border: `0.5px solid #2a2a2a`
- Border radius: 8px
- Padding: 7px 5px
- Flex: equal width, 3 tiles in a row with 5px gap, 12px side padding

### Project card

```
[name 12px/500]  [badge right-aligned]
[meta 9px/#666]
[part tags (optional)]
[3px progress bar]
```

- Background: `#1c1c1c`
- Border: `0.5px solid #272727`
- Border radius: 8px
- Padding: 10px
- Margin: 0 12px, 7px between cards
- Progress bar colors: green (100%), amber (>50%), red (<50%)

### Progress bar

- Height: 3px
- Track: `#222`
- Fill: green `#32b464` / amber `#f0a030` / red `#f05032`
- Border radius: 2px
- Margin top: 7px

### Metric tile (item detail)

```
[number 16px/#f0a030/600]
[label 8px/#555]
```

- Background: `#1e1e1e`
- Border radius: 8px
- Padding: 8px 6px
- 3 tiles in a row, 5px gap, inside 12px padding
- Used on: Item Detail screen, Project Detail header

### Field row (detail screens)

```
[label 11px/#888]    [value 11px/#e0ddd0 right-aligned]
```

- Padding: 7px 12px
- Border bottom: `0.5px solid #1e1e1e`
- Supplier/link value: `#f0a030` instead of default text color

### Section label

```
FASTENERS · 84 ITEMS
```

- Font: 9px, weight 500, uppercase, `letter-spacing: 0.06em`
- Color: `#555`
- Padding: 6px 12px 3px

### Primary CTA button

```
[label centered]
```

- Background: `rgba(240,160,48,0.12)`
- Border: `0.5px solid #634010`
- Color: `#f0a030`
- Font: 11–12px, weight 500
- Border radius: 8px
- Padding: 9–10px
- Margin: 6px 12px

### Secondary button

- Background: `#1a1a1a`
- Border: `0.5px solid #2a2a2a`
- Color: `#666`
- Same shape as primary

### Search bar

- Background: `#1a1a1a`
- Border: `0.5px solid #2a2a2a`
- Border radius: 8px
- Padding: 6px 10px
- Font: 10px, color `#555`
- Prefix icon: `⌕` at `#444`
- Margin: 0 12px 8px

### Filter pills (inventory screen)

- Default: `#1e1e1e` bg, `#2a2a2a` border, `#666` text
- Active: `rgba(240,160,48,0.12)` bg, `#634010` border, `#f0a030` text
- Font: 9px
- Padding: 2px 7px
- Border radius: 10px

### Scan viewfinder

- Background: `#0d0d0d`
- Frame: 118×118px, `1.5px solid #f0a030`, border radius 10px
- Corner markers: 12×12px, `2px solid #f0a030`, only corner edges visible
- Inner hint text: 9px, `#555`

### Alert banner (home screen)

- Red alert: `rgba(240,80,50,0.08)` bg, `rgba(240,80,50,0.15)` border-bottom
- Amber alert: `rgba(240,160,48,0.07)` bg, `rgba(240,160,48,0.15)` border-bottom
- Title: 10px, weight 500, appropriate status color
- Sub: 9px, `#666`
- Padding: 7px 12px

### Form input

- Background: `#1a1a1a`
- Border: `0.5px solid #2e2e2e`
- Border radius: 7px
- Padding: 6px 9px
- Font: 11px, `#e0ddd0`
- Placeholder: `#444`
- Right element (dropdown arrow / clear): `#666`

---

## Screen inventory

| Screen            | Nav tab    | Key components                                      |
|-------------------|------------|-----------------------------------------------------|
| Home              | Home       | Alert banner, 3 stat tiles, 2 quick lists (low stock + recent) |
| Inventory         | Inventory  | Search, filter pills, grouped list by category      |
| Item Detail       | Inventory  | 3 metrics, field rows, project tag chips, add/remove CTAs |
| Projects list     | Projects   | Project cards with progress bars + status badges    |
| Project Detail    | Projects   | Progress bar, in-stock list, missing list, order CTA |
| Scan              | Scan       | Mode switcher (AI/Barcode/Voice/Manual), viewfinder, result card |
| Add Item form     | Scan       | Pre-filled from AI scan, all fields editable        |
| Locations         | Inventory  | Color-dotted location list + item counts            |
| Low Stock view    | Home       | Filtered alert list + affected projects card        |

---

## AI scan flow (critical feature)

This is the app's standout feature. The flow must feel fast and frictionless:

```
1. User taps Scan tab
2. Camera opens with amber viewfinder frame
3. AI identifies item → shows name + confidence % + suggested location
4. User taps "Add to vault" → Add Item form opens, pre-filled
5. User confirms (or edits) → saved
```

- Confidence display: e.g. `"Confidence 97% · suggest: Electronics shelf"` in amber `#f0a030`
- Wrong item button: secondary style, leads back to viewfinder
- Mode buttons at top of scan screen: AI Identify (default active) · Barcode · Voice · Manual
- Active mode: amber pill style. Inactive: default surface style.

---

## Interaction patterns

- **Tap list row** → navigate to item detail
- **Tap project card** → navigate to project detail
- **Tap category pill** → filter list in place (no nav)
- **Tap low stock banner** → navigate to low stock view
- **Long press list row** → quick-edit qty (optional, v2 feature)
- **Swipe left on row** → reveal delete / adjust actions (optional, v2)
- **Back navigation** → amber `← Section name` text link at top of detail screens, no back button chrome

---

## Do / don't

| Do                                                    | Don't                                              |
|-------------------------------------------------------|----------------------------------------------------|
| Use amber only for primary actions and key numbers    | Use amber decoratively or for body text            |
| Keep all backgrounds in the `#161616` family          | Use white or light surfaces anywhere               |
| Use 3-state status system (OK / Low / Out)            | Add more status states without clear meaning       |
| Pre-fill forms from AI scan data                      | Make user type everything manually                 |
| Show affected projects on low stock screen            | Show low stock without context of impact           |
| Use 12px horizontal padding on all screens            | Let content touch screen edges                     |
| Abbreviate icon box labels (M3, ARD, LED, PLA)        | Use emoji in icon boxes                            |
| Keep bottom nav to exactly 4 items                    | Add 5th nav item or use a hamburger menu           |
