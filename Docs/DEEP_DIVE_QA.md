# MakerVault — Deep-Dive Technical Q&A

All answers verified against the actual codebase. Last updated: March 2026.

---

## Scanning & AI Core

### 1. What exactly happens when Gemini receives a scan?

**Payload:** Image preprocessed to configurable width (512–2048px depending on quality preset), JPEG compressed (60–95%), base64-encoded, sent with MIME type `image/jpeg` alongside a detailed prompt.

**Prompt instructs Gemini to:**
- Name parts like product listings ("HDMI Cable Male-to-Male 6ft" not "370-0064-01")
- Never use "Generic", "Unknown", or "N/A"
- Include physical attributes (length, connector types, color)
- Put model numbers in the MPN field, not the name

**Response fields:** `part_name`, `manufacturer`, `mpn`, `category`, `subcategory`, `specs` (key-value pairs), `markings_detected[]`, `confidence` (0–1), `alternatives[]` (up to 2 fallback identifications)

**Fallback on failure:**
- On 429/quota errors: tries `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-1.5-flash`
- On low confidence (<0.3): part_name reflects "cannot identify"
- On network failure: shows error screen with retry button

### 2. What are the 4 scan quality levels doing differently?

| Preset | Image Width | JPEG Quality | Est. Time | Est. Accuracy |
|---|---|---|---|---|
| Fast | 512px | 60% | ~1.5s | ~65% |
| Balanced (default) | 1024px | 80% | ~3s | ~80% |
| Detailed | 1536px | 90% | ~5s | ~90% |
| Maximum | 2048px | 95% | ~8s | ~95% |

All use `gemini-2.5-flash`. The difference is purely image resolution and compression — higher quality = more detail visible on small markings (SMD codes, QFP pins, faded text). The prompt is the same across all levels.

### 3. How does bulk scan work?

Single image sent to `identifyBulkParts()` with a different prompt: "identify each distinct component visible." Gemini returns a JSON array of identifications. No cropping — the full image is analyzed. User reviews each item individually with Add/Skip buttons.

### 4. How does the app handle components with no visible markings?

Gemini identifies by shape, package type, color, and context (e.g., a DO-35 package → "1N4148 Diode"). `markings_detected[]` will be empty. Confidence may be lower. The prompt instructs: "If you cannot identify the component, set confidence below 0.3."

### 5. What happens if the user loses internet mid-session?

- **During auto-scan:** Captures continue locally. Image preprocessing happens on-device. Gemini identification fails → `status: 'failed'` with error message. User can still review/discard in the review screen.
- **Persistence:** `persistNow()` saves all captures to AsyncStorage after every state change. Nothing is lost even if the app is killed.
- **On reconnect:** Failed captures remain in the queue but must be re-scanned (no automatic retry of Gemini calls).

### 6. How is the AI confidence score calculated and displayed?

Confidence is returned directly by Gemini as a decimal (0–1). The app multiplies by 100 and rounds for display. Badge colors: ≥80% green, 60–79% accent blue, <60% red. Below 60% shows a warning: "Low confidence — verify before confirming." In auto-scan review, "Confirm All ≥75%" is the batch threshold.

---

## Inventory & Data Model

### 7. Complete data schema for an inventory item

| Field | Type | Required | Populated by |
|---|---|---|---|
| id | uuid | Auto | System |
| user_id | uuid | Auto | Auth |
| name | text | Yes | AI or user |
| manufacturer | text | No | AI |
| mpn | text | No | AI |
| category | text | No | AI |
| subcategory | text | No | AI |
| description | text | No | User |
| specs | jsonb | No | AI (key-value pairs like {voltage: "5V"}) |
| quantity | int | Yes (default 0) | User (default 1 on scan) |
| low_stock_threshold | int | Yes (default 0) | User |
| image_url | text | No | System (480px/70% JPEG data URI) |
| datasheet_url | text | No | User |
| notes | text | No | AI markings or user |
| created_at | timestamptz | Auto | System |
| updated_at | timestamptz | Auto | System |

### 8. Can a single item exist in multiple locations?

Yes. The `part_locations` junction table links parts to storage locations with per-location quantities:
```
part_locations: { part_id, location_id, quantity }
```
Example: "10 resistors in Bin A, 5 on Shelf B."

### 9. How does quantity tracking work?

- Manual: user sets quantity during scan confirmation (default 1) or edits inline
- `decrementQuantity(id, amount)` available for project consumption
- Low stock alerts fire when `quantity <= low_stock_threshold`
- No automatic decrement on project assignment (parts are referenced, not reserved)

### 10. What happens when a duplicate item is scanned?

No automatic deduplication. A second scan of the same part creates a new inventory entry. Users must manually merge duplicates or increment quantity on the existing entry via inline editing.

### 11. How are items versioned or edited?

Last-write-wins, no version history. Editing via the part detail screen updates all fields in place and sets `updated_at` to current timestamp. Previous values are not stored.

### 12. What does the offline experience look like?

- **Reading:** Parts cached in Zustand memory from last fetch. Viewable until app is killed.
- **Writing:** Add/edit/delete fail without connection (Supabase RLS blocks unauthenticated writes).
- **Auto-scan:** Captures save locally to AsyncStorage. Gemini calls fail but captures persist for later review.
- **No local database** — no SQLite or offline-first sync queue.

---

## Organization & Locations

### 13. How are storage locations structured?

Hierarchical. `storage_locations` table has a `parent_id` field referencing itself:
```
Room → Shelf → Bin → Drawer
```
`LocationTree` component renders the nested structure as a tree. Each location has: name, parent_id, qr_code (unique), description.

### 14. How does the QR code label system work end to end?

1. **Generate:** Each location gets a unique `qr_code` value on creation
2. **Display:** `QRCodeLabel` component renders the QR using `react-native-qrcode-svg`
3. **Print:** User screenshots or exports the QR for printing on label paper
4. **Scan:** Scanning the QR code with MakerVault's camera navigates to that location's contents
5. **Format:** Encodes `makervault://location/{location_id}`

### 15. Is there a map or visual layout?

No. Locations are displayed as a hierarchical text list with color-coded dots. No spatial visualization, floor plan, or 3D view.

### 16. Can items be tagged with multiple labels?

No. Items have a single `category` and single `subcategory` (both text fields). No multi-tag or label system. Notes field can be used for informal tagging.

---

## Search & Discovery

### 17. How does smart search work technically?

Two-tier approach:
1. **AI parsing:** Query sent to Gemini with a prompt to extract structured filters (part_name, category, specs, keywords, intent). Results used to build Supabase query with `ilike` matching.
2. **Keyword fallback:** If AI parsing fails, splits query into terms, expands with electronics synonyms (pot→potentiometer, cap→capacitor, BJT→transistor), and builds OR conditions across name, manufacturer, mpn, category, description.

Not vector/semantic search — it's pattern matching with synonym expansion.

### 18. How does voice search work?

`expo-speech-recognition` handles speech-to-text on-device. Transcribed text is fed into the same smart search pipeline (see #17). Interim results shown live during speech. Final result triggers the search. Response can be spoken back via `expo-speech` TTS.

### 19. What is the category browser UX — how many taps?

1. Tap **Search tab** → category grid appears
2. Tap a **category card** (e.g., "Electronics") → drill-down screen with subcategories
3. Tap a **subcategory** (e.g., "Resistors") → filtered inventory list
4. Tap a **part** → part detail

**3–4 taps from app open to specific part.**

### 20. Can users create custom categories?

Not from the app UI. Categories are seeded in Supabase via migration. The RLS policy allows authenticated writes, so categories could be added via the Supabase dashboard or a future admin screen.

---

## Suppliers & Reordering

### 21. How do the 15 supplier links work?

Each supplier has a `url_template` with a `{query}` placeholder. The app's `getSupplierUrl()` function:
1. Builds a clean search query from the part name/MPN (strips "N/A", "Generic", limits to 6 words)
2. If the supplier has an `affiliate_url_template` AND the user has entered their affiliate code → uses the affiliate URL
3. Otherwise uses the plain URL template
4. Opens in the device browser via `expo-web-browser`

These are web search URLs, not deep links to specific products.

### 22. Is there real-time price data or stock checking?

No. The schema has `last_price`, `in_stock`, and `last_checked_at` fields in `part_supplier_links`, but they are never populated by app code. The app opens the supplier's search page — the user sees live prices on the supplier's website.

### 23. How does favourite suppliers work?

- `user_supplier_prefs` table: per-user, per-supplier, with `is_favourite` boolean (max 4)
- Star icon on each supplier row toggles favourite status
- On part detail screen: favourites appear first in the "Look up part" pill row
- In "Where to Buy" screen: favourites shown in a dedicated row at the top
- In Settings: "Your favourite suppliers" section shows current favourites with remove option

### 24. How does regional filtering work?

Each supplier has a `countries` array (e.g., `['US', 'UK', 'GLOBAL']`). User sets their country in Settings. The `filtered()` method shows suppliers matching the user's country OR marked 'GLOBAL'. Irrelevant suppliers are hidden entirely, not reordered.

### 25. How does datasheet search work?

A Google search link: `https://www.google.com/search?q={part_name} datasheet filetype:pdf`. Opens in the browser. No dedicated datasheet API integration (e.g., no Octopart datasheet endpoint).

---

## Projects

### 26. Full data model for a project

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| title | text | Project name |
| description | text | Free text |
| difficulty | enum | beginner / intermediate / advanced |
| estimated_hours | int | Build time estimate |
| source_url | text | Link to guide |
| source | enum | instructables / hackster / ai_generated |
| status | enum | idea / in_progress / completed |
| created_at | timestamptz | |

**Bill of materials:** `project_parts` junction table with `project_id`, `part_id`, `quantity_needed`, `quantity_owned` (snapshot), `notes`.

### 27. How does AI suggest buildable projects?

`generateProjectIdeas()` sends the user's inventory summary (grouped by category with counts) to Gemini with a prompt asking for 5 project ideas. The prompt instructs Gemini to prioritize projects where the user owns most parts and to include a mix of difficulties. Returns structured JSON with title, description, parts_needed (with `user_has` boolean), and category.

### 28. How does Instructables integration work?

`searchInstructables()` fetches from `https://www.instructables.com/json-api/search?q={query}&limit=10`. Parses the JSON response for title, description, URL, and thumbnail. Results shown as tappable rows that open the full guide in the browser.

### 29. When parts are assigned, are they reserved?

No. `quantity_owned` in `project_parts` is a snapshot taken when the project is created. The main `parts.quantity` is NOT decremented. Parts remain fully available for other projects.

### 30. Can a project have sub-tasks or build steps?

No. Projects are a flat parts checklist (BOM) with status tracking. No build steps, sub-tasks, or sequential instructions. The `notes` field on each project part can be used for informal step annotations.

---

## Auto-Scan Mode

### 31. How does motion detection work technically?

Currently: **timer-based auto-loop**. Both Handheld and On Stand modes use `setTimeout` with configurable delay (2s and 3.5s defaults). The app has infrastructure for accelerometer-based detection (`expo-sensors`) but it's disabled because the current dev build doesn't include the native module. Constants exist (`MOTION_THRESHOLD = 0.4`, `STILLNESS_THRESHOLD = 800ms`) for future accelerometer integration.

### 32. What is the exact UX of the trace animation?

4 accent-colored lines (3px thick) trace the viewfinder edges in sequence:
- **Top edge** fades in (250ms)
- **Right edge** fades in (250ms)
- **Bottom edge** fades in (250ms)
- **Left edge** fades in (250ms)
- Total: 1 second, then capture fires immediately
- Uses `Animated.timing` with `useNativeDriver: true` for smooth performance

### 33. What is the persistent queue stored in?

**AsyncStorage** under key `autoscan_unconfirmed`. Format: JSON array of `AutoScanCapture` objects (id, imageUri, thumbnailUri, status, result, quantity, location, confirmed, discarded, error). Written by `persistNow()` after every state mutation.

### 34. If phone is killed and reopened, what state is restored?

- Trigger mode preference restored from AsyncStorage
- Timer interval restored from AsyncStorage
- All unconfirmed captures (status=done, not confirmed/discarded) merged back into state
- Home screen shows "X Pending" stat tile → tapping navigates to review screen
- The auto-scan camera session is NOT resumed — user must manually re-enter auto-scan

### 35. Is there a maximum queue size?

No enforced limit. Queue grows unbounded (limited only by device memory and AsyncStorage capacity, typically ~6MB).

### 36. Can the user delete individual captures during the session?

Not during the live camera session — the thumbnail strip is view-only. In the review screen, the "Discard" button removes individual captures. Discarded items are marked but not deleted until "Save to Inventory" clears the session.

---

## Auth & Accounts

### 37. How does authentication work?

Supabase Auth with email/password (`signIn`, `signUp`). On first launch with no session, the app auto-signs-in anonymously via `supabase.auth.signInAnonymously()`. Session persisted to AsyncStorage. `onAuthStateChange` listener keeps the Zustand auth store in sync.

### 38. Is there a guest/local mode?

Yes, implicitly. Anonymous auth is the default — no account creation required. Inventory is stored under the anonymous user ID. Data persists across app launches but is lost on reinstall (new anonymous session).

### 39. How is data synced across devices?

Same email/password login on multiple devices shares the same `user_id`, so Supabase queries return the same data. No real-time sync — data fetched on screen mount via `fetchParts()`. Changes on one device appear on others after a refresh.

### 40. What happens to local data if user signs out?

`signOut()` clears the Supabase session. In-memory Zustand state persists briefly but Supabase queries fail (RLS blocks unauthenticated access). On relaunch, a new anonymous session is created — old data is orphaned in the database under the previous anonymous user ID.

---

## Themes & Personalization

### 41. What are the 10 themes changing?

Colors only — 30+ tokens per theme including 7 background layers, 5 text tiers, accent color, status colors (OK/low/out), alert backgrounds, scan frame color, and border colors. Typography, icon style, and layout are identical across all themes.

### 42. Are themes applied globally or per-screen?

Globally. `ThemeProvider` wraps the root layout. Every component reads colors from `useTheme()`. No per-screen overrides.

### 43. Is there a light mode?

No. All 10 themes are dark variants (darkest background ≤ #1E1E1E). The `app.json` has `userInterfaceStyle: "automatic"` but no light theme variants are defined.

### 44. Where does haptic feedback fire?

Currently: photo capture in auto-scan (`Haptics.ImpactFeedbackStyle.Medium`) and single scan. The `hapticFeedbackEnabled` setting exists in the store but is not wired to all interactions (buttons, confirmations, deletions, navigation).

---

## Data & Export

### 45. Can users export their inventory?

No export feature in the app. Data is in Supabase PostgreSQL and could be exported via the Supabase dashboard or API, but no in-app CSV/JSON/PDF export exists.

### 46. Is there backup beyond Supabase?

No. Supabase is the single source of truth. No automated backups to cloud storage, no local database copies. Supabase's own backup system (point-in-time recovery on Pro plan) is the only protection.

### 47. Are there analytics or usage stats?

The `search_history` table exists in the schema but is never written to in the current code. No analytics dashboard, usage tracking, or stats visualization. The Home screen shows total parts count and low stock count.

### 48. Is there an import path?

No import feature. Parts are added via scanning (AI identification), manual entry (AddPartSheet), or bulk scan. No CSV/spreadsheet import.

---

## Performance & Technical

### 49. What is the typical end-to-end scan time?

| Step | Fast | Balanced | Detailed | Maximum |
|---|---|---|---|---|
| Image preprocessing | 0.3s | 0.5s | 1.0s | 1.5s |
| Thumbnail generation | 0.2s | 0.3s | 0.3s | 0.5s |
| Network + Gemini | 1.0s | 2.2s | 3.7s | 6.0s |
| **Total** | **~1.5s** | **~3s** | **~5s** | **~8s** |

Network latency to Google's API is the dominant factor.

### 50. App install and DB size

- **Source code:** ~2.5 GB with node_modules; compiled APK ~150 MB
- **Database:** Supabase hosted PostgreSQL, no local DB
- **AsyncStorage:** ~5–10 MB (settings, auto-scan captures, theme preference)
- **Per-part storage:** ~20–40 KB (thumbnail data URI in `image_url` text field)
- **Estimated DB per user:** ~1–5 MB for 100 parts with thumbnails

### 51. Are camera frames processed on-device before Gemini?

Yes. In `lib/image.ts`:
1. `expo-image-manipulator` resizes to target width (512–2048px)
2. Compresses to target JPEG quality (60–95%)
3. On native: reads via `expo-file-system` File API → ArrayBuffer → base64
4. On web: fetch → blob → FileReader → base64
5. Thumbnail generated separately: 480px wide, 70% quality from ORIGINAL camera image

### 52. What are the known failure modes?

| Failure | Handling |
|---|---|
| Gemini quota exceeded (429) | Tries 3 fallback models, then shows error |
| Camera capture fails in Expo Go | Falls back to image picker (gallery) |
| expo-sensors not in dev build | Accelerometer disabled, falls back to timer |
| expo-linear-gradient not in build | Auto-detects via UIManager, renders plain View |
| AsyncStorage full | Silently fails to persist (catches error) |
| Supabase offline | Reads from in-memory cache, writes fail |
| Part delete while viewing | Navigates back first, deletes 300ms later |
| Anonymous session lost on reinstall | New session created, old data orphaned |
| LinearGradient native view crash | Force-disabled with `_LG = null` until rebuild |
