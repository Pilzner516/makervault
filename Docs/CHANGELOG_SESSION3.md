# MakerVault — Session 3 Changelog (2026-03-19 to 2026-03-20)

## Summary
Major feature session: category color-coding, per-supplier price check, QR label system with Phomemo D30 support, barcode scanning, "Find Item in Cabinet" AR feature, wishlist workflow, Octopart integration, product images, simplified QR codes, local Android build setup, and dev infrastructure fixes.

---

## New Features

### Robotics Category
- Added Robotics as the 8th category with 24 subcategories (Robot Kits, Servo Motors, Stepper Motors, DC Motors, Motor Drivers, ESCs, Drone Parts, Lidar, etc.)
- Keywords added to search.tsx and category/[id].tsx for fuzzy matching
- Supabase migration: `20260319000000_add_robotics_category.sql`
- Features page updated (8 categories, 70+ subcategories)

### Category Color-Coding
- New `lib/categoryColors.ts` — 8 categories mapped to distinct colors
- Category badges on scan confirm screen and part detail use per-category colors
- Bulk scan results show color-coded category pills

### Per-Supplier Price Check (renamed from "Where to Buy")
- Renamed throughout app: "Where to Buy" → "Price Check"
- `scanSupplierPrices()` in gemini.ts — asks Gemini for differentiated per-supplier prices
- Auto-scans favourite + MV preferred suppliers on screen open
- "Search More Suppliers" button triggers second scan for remaining suppliers
- Per-row loading spinners while scanning
- "Verify" shown when no price returned for a supplier
- Price Check button styled in Electric Blue

### Price Check Persistence
- `where-to-buy.tsx` accepts `partId` param
- After price scan, auto-saves per-supplier prices to part's `specs` (e.g., `price_Amazon`, `price_DigiKey`, `price_scan_date`)
- Part detail shows saved supplier prices with Electric Blue values
- "Last Price Check" date displayed

### AI Price Estimates at Scan Time
- Gemini prompt updated to return `estimated_price` (e.g., "$0.50 - $2.00")
- Added to `GeminiIdentification` type
- Stored in `specs.estimated_price` when saving parts
- Displayed on confirm screen and part detail

### Electric Blue Brand Color
- Defined as `ELECTRIC_BLUE = '#00c8e8'` in `constants/theme.ts`
- LogoHeader now uses Electric Blue for "Vault" text and logo mark (consistent across all themes, matching splash screen)
- Price Check buttons, wishlist bookmarks, and product image UI all use Electric Blue

### QR Code Label System
- **Universal QR Component** — supports `location`, `category`, `part` types with 3 sizes:
  - Small/D30 (80px) — optimized for Phomemo D30 12mm labels
  - Medium (120px) — standard drawer/bin labels
  - Large (200px) — full detail with "Scan with MakerVault" hint
- **Simplified QR data** — all codes encode `MV:{uuid}` (minimal data, smallest QR)
- **New `/qr-labels` screen** — size selector, preview, Share, Save to Photos, Print/Phomemo
- **Phomemo D30 integration** — generates print-optimized PNG, shares via system share sheet for Phomemo app pickup
- QR buttons added to part detail header and category screen header
- Legacy `makervault://` format still supported for backward compat

### "Find Item in Cabinet" Feature
- New `app/find-item.tsx` — full-screen camera with continuous QR scanning
- Real-time AR overlay rectangles on detected QR codes
- Target match: bright Electric Blue highlight + haptic + "Found it!" banner
- Non-matching QR codes: dim gray rectangles
- Accessed via "Find Item" button on part detail screen

### Barcode Scanning
- Scan screen barcode mode now uses `onBarcodeScanned` from expo-camera
- Supports EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR
- Wider/shorter viewfinder with scan line indicator in barcode mode
- Capture button hidden — scanning is automatic, "Point at barcode" hint shown
- Barcode data sent to Gemini for product identification on confirm screen

### Multi-QR Detection
- Scanner collects all QR codes over 1.5 seconds before processing
- Single code → navigates directly to item
- Multiple codes → shows alert listing all matched items

### QR Deep Link Support
- `MV:{uuid}` QR codes auto-resolve to parts, categories, or locations
- `makervault://part/{id}` → part detail
- `makervault://category/{id}` → category screen
- `makervault://location/{id}` → locations (existing)

### Wishlist Workflow
- Bookmark icon on part detail header — tap to add/remove from wishlist
- "Add to Wishlist" button on Price Check screen
- Wishlist card added to home screen launcher grid
- Wishlist count fetched on mount

### Octopart Integration
- `lib/octopart.ts` updated: `EXPO_PUBLIC_OCTOPART_API_KEY`, `isOctopartAvailable()` helper
- "Fetch Live Data (Octopart)" button on part detail when MPN exists
- Real seller prices displayed inline with product URLs
- Graceful degradation when API key not configured
- Octopart prices overlay Gemini estimates on Price Check screen

### Product Images
- Scan photo ("YOUR SCAN") + product image ("PRODUCT") shown side by side on part detail
- Product image fetched via: Octopart → Mouser CDN → Google Images search fallback
- "Find Product Image" button for parts without one
- Tap existing product image → "Re-scan Image" / "Browse Images" / Cancel menu
- Re-scan uses current part name (reflects user edits)
- 3-second timeout on product image fetch at scan time (doesn't block save)

### Larger Item Thumbnails
- ItemRow icon/image box doubled from 36x36 to 72x72
- Applies to all lists: inventory, search results, category drill-downs
- Icon label font bumped from 14 to 18

### Date Added
- Part detail shows "Date Added" at bottom of details panel (formatted "Mar 19, 2026")

### Push Notifications (added then removed)
- Implemented daily 9 AM low-stock check, then removed at user's request
- Existing in-app alerts (`sendLowStockAlert`, `sendLowStockDigest`) remain
- Settings toggle for low stock alerts remains

---

## Bug Fixes & Improvements
- Fixed bulk identify prompt missing Robotics category
- Fixed where-to-buy showing identical AI estimate on every supplier row
- Fixed QR label share buttons hidden behind Android nav bar (moved to ScrollView)
- Fixed expo-sharing crash at app launch (lazy require instead of direct import)
- Fixed expo-media-library crash (lazy require at module level)
- Fixed expo-file-system API usage for SDK 54 (File/Paths instead of classic cacheDirectory)
- Fixed product image returning black screen (replaced Gemini URL hallucination with real CDN lookups)
- Removed confusing "file saved to cache" fallback message

---

## Files Changed (26 files, +1435 lines)

### New Files
- `app/find-item.tsx` — Find Item in Cabinet camera screen
- `app/qr-labels.tsx` — QR Label generation/export screen
- `lib/categoryColors.ts` — Category → color mapping
- `supabase/migrations/20260319000000_add_robotics_category.sql`

### Modified Files
- `app/(tabs)/index.tsx` — Wishlist card on home screen
- `app/(tabs)/scan.tsx` — Barcode scanning, multi-QR, simplified QR handling
- `app/(tabs)/search.tsx` — Robotics keywords
- `app/_layout.tsx` — New routes (qr-labels, find-item), Price Check rename
- `app/auto-scan-review.tsx` — Save estimated_price in specs
- `app/category/[id].tsx` — Robotics keywords, QR button in header
- `app/confirm.tsx` — Barcode mode, category colors, price estimate, product image fetch
- `app/features.tsx` — 8 categories, Price Check rename
- `app/locations.tsx` — Auto-select location from QR scan param
- `app/modal.tsx` — Low stock alerts toggle cleanup
- `app/part/[id].tsx` — QR button, wishlist, Octopart, product images, category colors, price persistence, date added, Find Item button, larger photos
- `app/where-to-buy.tsx` — Per-supplier pricing, price persistence, wishlist, Octopart overlay
- `components/QRCodeLabel.tsx` — Universal QR component with MV:{id} format
- `components/UIKit.tsx` — Electric Blue import, LogoHeader uses ELECTRIC_BLUE, 72x72 thumbnails
- `constants/theme.ts` — ELECTRIC_BLUE constant
- `lib/gemini.ts` — scanSupplierPrices, fetchProductImageUrl, estimated_price in prompts
- `lib/notifications.ts` — Cleanup (push notification functions removed)
- `lib/octopart.ts` — EXPO_PUBLIC prefix, isOctopartAvailable, error handling
- `lib/types.ts` — estimated_price on GeminiIdentification
- `lib/zustand/autoScanStore.ts` — estimated_price in capture result

---

## Technical Decisions

### expo-sharing must be lazy-loaded
Direct `import * as Sharing from 'expo-sharing'` crashes at app launch in Expo Go because the native module isn't registered. Must use `try { Sharing = require('expo-sharing') } catch {}` pattern.

### expo-file-system SDK 54 API
The classic API (`cacheDirectory`, `writeAsStringAsync`, `EncodingType`) is gone in SDK 54. Must use `import { File, Paths } from 'expo-file-system'` with `new File(Paths.cache, filename)` and `file.write(base64, { encoding: 'base64' })`.

### Gemini can't find real image URLs
Gemini hallucinates URLs — they look real but return 404 or black screens. Product image fetch now uses real sources: Octopart API → Mouser CDN by MPN → Google Images search URL fallback.

### QR code data minimized to MV:{uuid}
Full `makervault://type/uuid` URLs are unnecessary — the app can look up any UUID against parts/categories/locations. `MV:` prefix identifies it as MakerVault. Shorter data = simpler QR = better for small labels.

---

## Dev Infrastructure (2026-03-20)

### Android Studio + Local Builds
- Installed Android Studio + Android SDK on dev machine
- Downloaded Node 20 portable (`C:\Users\seblu\node20\`) to work around Node 24 incompatibility with Expo
- First local build via Gradle: `./gradlew assembleDebug` in `android/` directory
- APK output at `android/app/build/outputs/apk/debug/app-debug.apk` (212MB)
- Local builds are unlimited and free (no EAS build quota)

### EAS Build Quota Hit
- Free EAS plan ran out of Android builds for the month (resets April 1st)
- Switched to local builds as permanent solution
- Build command for future reference:
  ```
  export ANDROID_HOME="/c/Users/seblu/AppData/Local/Android/Sdk"
  export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
  export PATH="/c/Users/seblu/node20:$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
  cd android && ./gradlew assembleDebug
  ```

### Node 24 Incompatibility
- Node 24.13.1 breaks Expo SDK 54 — `expo-modules-core` uses `.ts` files in node_modules that Node 24 can't handle
- Solution: downloaded Node 20.18.3 portable to `C:\Users\seblu\node20\`
- All build commands must use Node 20 (EAS CLI, Gradle, expo)
- Metro dev server still works with Node 24 (only build/config commands fail)

### Anonymous Auth + App Reinstall
- Uninstalling and reinstalling the app creates a new anonymous user ID
- All parts are tied to the old user via RLS `user_id` column
- Fix: `UPDATE parts SET user_id = 'new_id' WHERE user_id != 'new_id'` in Supabase SQL Editor
- Same for wishlist, storage_locations, projects tables
- Pre-launch: need persistent auth (email/password) or user migration strategy

### expo-sharing Not In Build
- `expo-sharing` native module (`ExpoSharing`) not registered in the local dev build
- `require('expo-sharing')` silently fails → all sharing falls through to RN `Share` API
- RN `Share` on Android only supports text (not file URIs)
- Current workaround: `getContentUriAsync()` converts `file://` to `content://`, then shares via RN Share or expo-intent-launcher
- QR sharing currently sends text link instead of image
- **Fix needed:** Verify `expo-sharing` autolinks correctly in local build, or add explicit native module registration

### Push Notifications Removed
- Implemented daily 9 AM low-stock reminders, then removed at user's request
- Existing in-app alerts remain (`sendLowStockAlert`, `sendLowStockDigest`)
- `expo-notifications` plugin removed from app.json

---

## Bug Fixes (Late Session)
- Fixed QR label buttons hidden behind Android nav bar (moved to ScrollView)
- Fixed expo-sharing crash at app launch (lazy require instead of direct import)
- Fixed expo-media-library crash (lazy require at module level)
- Fixed expo-file-system API for SDK 54 (File/Paths instead of classic cacheDirectory)
- Fixed product image returning black screen (replaced Gemini URL hallucination with real CDN lookups)
- Fixed "sharing not supported in this build" errors (multiple attempts, settled on content URI approach)
- Removed confusing "file saved to cache" fallback message
- Added product image re-scan capability (tap existing image → Re-scan / Browse / Cancel)

---

## Files Changed (28 files, +1,480 lines)

### New Files
- `app/find-item.tsx` — Find Item in Cabinet camera screen
- `app/qr-labels.tsx` — QR Label generation/export screen
- `lib/categoryColors.ts` — Category → color mapping
- `supabase/migrations/20260319000000_add_robotics_category.sql`
- `Docs/CHANGELOG_SESSION3.md`
- `android/` — Local native Android project (generated by expo prebuild)

### Modified Files
- `app/(tabs)/index.tsx` — Wishlist card on home screen
- `app/(tabs)/scan.tsx` — Barcode scanning, multi-QR, simplified QR handling
- `app/(tabs)/search.tsx` — Robotics keywords
- `app/_layout.tsx` — New routes (qr-labels, find-item), Price Check rename
- `app/auto-scan-review.tsx` — Save estimated_price in specs
- `app/category/[id].tsx` — Robotics keywords, QR button in header
- `app/confirm.tsx` — Barcode mode, category colors, price estimate, product image fetch
- `app/features.tsx` — 8 categories, Price Check, QR labels, barcode, Find Item, product images
- `app/locations.tsx` — Auto-select location from QR scan param
- `app/modal.tsx` — Settings cleanup
- `app/part/[id].tsx` — QR button, wishlist, Octopart, product images, category colors, price persistence, date added, Find Item, larger photos, re-scan
- `app/where-to-buy.tsx` — Per-supplier pricing, price persistence, wishlist, Octopart overlay
- `components/QRCodeLabel.tsx` — Universal QR component with MV:{id} format
- `components/UIKit.tsx` — Electric Blue import, LogoHeader uses ELECTRIC_BLUE, 72x72 thumbnails
- `constants/theme.ts` — ELECTRIC_BLUE constant
- `lib/gemini.ts` — scanSupplierPrices, fetchProductImageUrl, estimated_price in prompts
- `lib/notifications.ts` — Push notification functions removed, in-app alerts remain
- `lib/octopart.ts` — EXPO_PUBLIC prefix, isOctopartAvailable, error handling
- `lib/types.ts` — estimated_price on GeminiIdentification
- `lib/zustand/autoScanStore.ts` — estimated_price in capture result

---

## Technical Decisions (Late Session)

### expo-file-system SDK 54 API
Classic API (`cacheDirectory`, `writeAsStringAsync`, `EncodingType`) is gone. Use `import { File, Paths } from 'expo-file-system'` with `new File(Paths.cache, filename)` and `file.write(base64, { encoding: 'base64' })`.

### expo-sharing must be lazy-loaded in Expo Go
Direct `import * as Sharing from 'expo-sharing'` crashes at launch in Expo Go. In dev builds, the native module may still not be linked — use `try { require('expo-sharing') } catch {}` with fallback to `getContentUriAsync()` + RN `Share`.

### Product images: Gemini hallucinates URLs
Gemini generates realistic-looking image URLs that return 404/black. Replaced with: Octopart → Mouser CDN → Google Images search URL. The search URL opens in browser; direct CDN images display inline.

### Node 20 required for builds
Node 24 breaks `expo-modules-core` (tries to strip TypeScript from node_modules). Portable Node 20 at `C:\Users\seblu\node20\`. Metro dev server works on any Node version — only build commands need Node 20.

### Local builds via Gradle
EAS free tier has monthly build limits. Local builds with `./gradlew assembleDebug` are unlimited. Requires Android Studio + SDK installed. First build takes ~15 min, subsequent builds ~5 min.

---

## Pending / Next Session
1. **Fix expo-sharing in local build** — Verify native module links correctly; may need explicit config
2. **Email/password auth** — On hold by user request, but needed before launch to prevent data loss on reinstall
3. **Custom categories from UI** — Users can't create categories from the app yet
4. **Offline mode** — No local database, reads fail without connection
5. **Project build steps** — Projects are flat parts lists only
6. **Pre-launch: generic error messages** — Replace all technical errors with user-friendly messages
7. **Pre-launch: re-enable RLS** — Row Level Security disabled for development
8. **Pre-launch: fix anonymous auth persistence** — Reinstalling app loses user data link
