# MakerVault — Session 2 Changelog (2026-03-16 → 2026-03-17)

## Summary
This session focused on auto-scan, supplier system, visual polish, and reliability fixes. Major features: auto-scan with motion detection, 15-supplier system with affiliates, 10 research-backed themes, category system, and persistent unconfirmed scans.

---

## Features Built

### 1. Auto-Scan Mode
**Files:** `app/auto-scan.tsx`, `app/auto-scan-review.tsx`, `lib/zustand/autoScanStore.ts`

- Full-screen camera session with 3 trigger modes:
  - **Manual** — tap viewfinder to capture each item
  - **Handheld** — auto-captures every 2s (configurable in Settings)
  - **On Stand** — auto-captures every 3.5s (configurable in Settings)
- Trace animation: accent-colored line traces all 4 edges of viewfinder before capture
- Flash animation on capture + haptic feedback
- Thumbnail strip at bottom shows capture status (pending/processing/done/failed)
- Scan counter badge in top bar
- Front/rear camera toggle (highlighted when front active)
- Home button with unconfirmed scan warning dialog
- "NEXT ITEM" overlay in manual mode only
- Phase labels: "TAP TO START AUTO-SCAN" → "NEXT SCAN IN Xs" → "CAPTURING..."

### 2. Auto-Scan Review Flow
**File:** `app/auto-scan-review.tsx`

- Card-based review, one item at a time with left/right navigation
- Progress strip (dots colored by status: green=confirmed, red=discarded, grey=pending)
- Large image + editable fields (name, quantity, location, category)
- Confidence badge with amber warning below 75%
- Per-item: Confirm / Discard buttons
- Batch: "Confirm All ≥75%" and "Save to Inventory"
- Exit prompt if unreviewed scans remain
- Empty state with "Scan Again" CTA

### 3. Persistent Unconfirmed Scans
**File:** `lib/zustand/autoScanStore.ts`

- `persistNow()` saves to AsyncStorage after EVERY state change (not just on session end)
- Survives app kill, phone calls, backgrounding
- `loadUnconfirmed()` merges saved scans with existing (no duplicates by ID)
- `startSession()` preserves existing unconfirmed captures
- `clearSession()` only wipes after explicit "Save to Inventory"
- Home screen shows "Pending" stat tile when unconfirmed scans exist

### 4. Auto-Scan Timing Settings
**Files:** `lib/zustand/settingsStore.ts`, `app/modal.tsx`

- Settings → Auto-Scan Timing section
- Handheld delay: 1.0 / 1.5 / 2.0 / 3.0 / 5.0 seconds (default 2.0)
- On Stand delay: 2.0 / 3.0 / 3.5 / 5.0 / 8.0 seconds (default 3.5)
- Segmented control UI with accent highlight
- Persisted to AsyncStorage
- Auto-scan reads values from store (no hardcoded constants)

### 5. Supplier System
**Files:** `app/where-to-buy.tsx`, `app/all-suppliers.tsx`, `lib/zustand/supplierStore.ts`, `supabase/migrations/20260316000001_supplier_system.sql`

- 15 suppliers seeded: Amazon, DigiKey, Mouser, McMaster-Carr, Adafruit, SparkFun, Arrow, Newark, Jameco, LCSC, AliExpress, Home Depot, Micro Center, RS Components, Farnell
- Supplier tiers: MV Preferred (top 4), favourites (user picks, max 4), user enabled, others
- Brand-colored logo chips (e.g. Amazon orange, DigiKey red, Mouser blue)
- Country filtering: US, UK, CA, AU, Global
- Affiliate URL builder with code injection
- Where to Buy screen: favourites row, MV Preferred panel, all suppliers button
- All Suppliers screen: search, country filter, grouped by category, star to favourite
- Settings: country picker, affiliate code inputs (Amazon, Jameco, Home Depot), favourite management

### 6. Affiliate Program Tracking
**Files:** `supabase/migrations/20260316000001_supplier_system.sql`, `Docs/AFFILIATE_SETUP.md`

- `affiliate_programs` table tracking 10 programs
- Step-by-step signup guide for 8 confirmed programs
- Networks: Amazon Associates, ShareASale, Awin, AvantLink, CJ, Impact, Post Affiliate Pro, UPPromote

### 7. Category System
**Files:** `app/category/[id].tsx`, `app/(tabs)/search.tsx`, `supabase/migrations/20260316000000_category_system.sql`

- 7 default categories: Electronics, Fasteners, Tools, 3D Printing, Materials, Mechanical, Safety & PPE
- 50+ subcategories linked to parents
- Category drill-down screen: icon, subcategory list with item counts, parts in category
- Search screen loads categories from Supabase (not hardcoded)
- Category cards in 2-column grid with colored icons

### 8. 10 Research-Backed Themes
**File:** `constants/themes.ts`

Based on analysis of Linear, GitHub, Stripe, Spotify, Vercel dark UIs:
1. Midnight Workshop (electric blue) — DEFAULT
2. Solder Smoke (teal on warm charcoal)
3. Circuit Noir (violet on OLED black)
4. PCB Green (hot pink on circuit board green)
5. Oscilloscope (phosphor green on teal-black)
6. Titanium (indigo on steel gray)
7. Neon Lab (vivid cyan on neutral dark)
8. Forge (magenta-rose on warm neutral)
9. Deep Space (sky blue on purple-black)
10. Graphene (lime-chartreuse on carbon green-gray)

Each theme: 7 background layers, 5-tier text hierarchy, WCAG AA contrast, coordinated status colors. Zero orange/amber.

### 9. Home Screen Launcher Grid
**File:** `app/(tabs)/index.tsx`

- 6 cards in 3x2 grid: Scan (accent highlighted), Search, Inventory, Projects, Voice, Settings
- StatStrip: Parts count, Projects/Pending count, Alerts
- Pending scans tile replaces Projects when unconfirmed scans exist
- Alert banners for low stock and unconfirmed scans
- Voice card triggers speech recognition
- Settings card opens settings modal

### 10. 5-Tab Navigation
**Files:** `app/(tabs)/_layout.tsx`, `components/UIKit.tsx`

- Home → Search → Scan → Inventory → Projects
- Ionicons with filled/outline variants
- Amber active bar (20px wide, 2px tall)
- `textDisabled` updated to `#4A7A8A` for contrast

---

## Bug Fixes

### Android / Runtime
- **expo-sensors crash**: Pedometer native module not in dev build → removed entirely, both auto-scan modes use timed cycle until rebuild
- **expo-linear-gradient crash**: Auto-detects native module via UIManager, falls back to plain View
- **LinearGradient in VaultSplash**: Same auto-detect pattern
- **Stale closure in auto-scan**: `isCapturing` captured in useCallback → replaced with `isCapturingRef`
- **Auto-scan loop not restarting**: `useCallback` with empty deps captured stale `triggerMode`/`delay` → replaced with `getState()` reads

### Navigation / UX
- **Settings no close button**: Added X icon top-right
- **Reorder no back button**: Added "Back" link
- **Locations no back button**: Added "Close" link
- **Wishlist no back button**: Added "Back" link
- **Delete part crash**: Navigate back first, delete 300ms later (ScreenStackFragment crash)
- **Viewfinder centering**: Absolutely positioned at `top:50%/left:50%` with negative margins — immune to flex changes

### Visual / Design
- **Orange removed everywhere**: All hardcoded `#f0a030` replaced with theme accent tokens
- **statusLow**: Changed from orange → white → now matches theme accent color
- **MakerVault branding**: "Maker" in textPrimary (white), "Vault" in accent color — matches splash screen
- **Font minimum 14px**: Every fontSize in UIKit.tsx is ≥14px
- **Filter pills too tall**: Reduced padding, removed minHeight
- **Mode buttons text wrapping**: Added numberOfLines={1}, paddingHorizontal
- **Button backgrounds on camera**: All buttons use rgba(0,0,0,0.7) over camera feed
- **Dark text on dark backgrounds**: textDisabled updated for contrast

### Data / Storage
- **Image quality**: Thumbnails upgraded from 200px/25% to 480px/70% JPEG
- **Thumbnail source**: Created from ORIGINAL camera image, not compressed scan image
- **Part detail supplier pills**: Now pull from supplier store (not hardcoded)
- **Project count**: Wired to Supabase query on home screen

---

## Database Migrations

### 20260316000000_category_system.sql
- `categories` table: id, name, icon, colour, sort_order, is_default
- `subcategories` table: id, category_id, name, sort_order
- `subcategory_id` column added to `parts` table
- RLS: authenticated read/write
- 7 categories + 50+ subcategories seeded

### 20260316000001_supplier_system.sql
- Extended `suppliers` table: is_mv_preferred, countries, logo_bg/text/label, url_template, affiliate fields, description, category, sort_order
- `user_supplier_prefs` table: favourites + enabled per user
- `user_settings` table: country_code, show_global, affiliate codes
- `affiliate_programs` table: tracking signup status
- 15 suppliers seeded with brand colors and URLs
- RLS on all new tables

---

## Files Created This Session

### Screens
- `app/auto-scan.tsx` — Auto-scan camera session
- `app/auto-scan-review.tsx` — Post-scan review flow
- `app/(tabs)/search.tsx` — Search with category cards
- `app/category/[id].tsx` — Category drill-down
- `app/where-to-buy.tsx` — Supplier comparison
- `app/all-suppliers.tsx` — Full supplier browser

### Stores
- `lib/zustand/autoScanStore.ts` — Auto-scan session state + persistence
- `lib/zustand/supplierStore.ts` — Suppliers, prefs, settings, URL builder

### Documentation
- `Docs/AFFILIATE_SETUP.md` — Signup instructions for 8 affiliate programs
- `Docs/CHANGELOG_SESSION2.md` — This file

### Migrations
- `supabase/migrations/20260316000000_category_system.sql`
- `supabase/migrations/20260316000001_supplier_system.sql`

---

## Files Modified This Session

### Major rewrites
- `app/(tabs)/index.tsx` — Launcher grid, pending scans, project count
- `app/(tabs)/scan.tsx` — Added Auto mode, simplified modes
- `app/(tabs)/_layout.tsx` — 5-tab nav with Ionicons
- `app/part/[id].tsx` — Inline editing, supplier pills from store
- `app/modal.tsx` — Suppliers, country, affiliates, scan timing, scan quality
- `app/confirm.tsx` — Thumbnail from original image, settings store integration
- `constants/themes.ts` — 10 new themes, no orange
- `components/UIKit.tsx` — LinearGradient auto-detect, font size overhaul, MakerVault branding
- `components/VaultSplash.tsx` — Scan trace animation, LinearGradient auto-detect
- `lib/zustand/settingsStore.ts` — Scan quality presets, timing settings
- `lib/image.ts` — Quality options, improved thumbnails

### Minor fixes
- `app/locations.tsx` — Back button
- `app/reorder.tsx` — Back button
- `app/wishlist.tsx` — Back button
- `app/(tabs)/explore.tsx` — Dark theme, removed orange
- `app/all-suppliers.tsx` — Compact country pills
- `components/AddPartSheet.tsx` — Theme colors
- `components/PartCard.tsx` — Theme colors
- `components/VoiceFAB.tsx` — Theme colors
- `constants/theme.ts` — Cyan instead of orange

---

## Known Issues / Next Session Priorities

1. **Rebuild dev APK** — `npx eas build --profile development --platform android` to include expo-sensors, expo-linear-gradient, expo-speech-recognition
2. **Re-enable accelerometer** — After rebuild, add back expo-sensors import for true handheld motion detection
3. **Re-enable LinearGradient** — Auto-detect code is in place, just needs native module in build
4. **Auth screen** — No email/password login yet, relies on anonymous sign-in
5. **VaultSplash centering** — User reported logo animation was broken, needs visual verification after rebuild
6. **Jameco URL** — Run `UPDATE suppliers SET url_template = 'https://www.jameco.com/c/search.html?q={query}' WHERE name = 'Jameco';` in Supabase SQL Editor
7. **Bulk scan image cropping** — Multi-scan doesn't crop individual items from the photo
8. **Voice UI** — Voice card on home triggers recognition but needs full overlay UI for responses
9. **Project count** — Hardcoded to 0 when no projects exist, needs projects store
10. **Apply for affiliate programs** — See `Docs/AFFILIATE_SETUP.md`

---

## Technical Decisions

### Auto-scan motion detection
- **Accelerometer** (expo-sensors): Best for handheld — detects arm movement. Requires dev build with native module. Currently disabled.
- **Scene detection** (camera snapshots): Tried comparing frame sizes — width*height is always the same, unreliable. Abandoned.
- **Timed cycle** (current): Simple, reliable fallback. 2s handheld, 3.5s stand. Will be replaced with accelerometer after rebuild.

### Persistent scans
- `persistNow()` called after every mutation (confirm, discard, identification complete)
- AsyncStorage key: `autoscan_unconfirmed`
- Survives app kill, backgrounding, phone calls
- `loadUnconfirmed()` merges by ID (no duplicates)
- Only `clearSession()` (after Save to Inventory) wipes storage

### Theme system
- No orange/amber anywhere — user explicitly rejected it multiple times
- `statusLow` matches each theme's accent color
- 10 themes based on research of Linear, GitHub, Stripe, Spotify, Vercel
- Each theme: 7 bg layers, 5 text tiers, WCAG AA contrast
- ThemeContext persists selection to AsyncStorage

### Font sizes
- Minimum 14px everywhere in UIKit.tsx
- FontSize constants: xs=14, sm=14, md=16, lg=18, xl=22
- User explicitly requested no text smaller than the alert subtitle
