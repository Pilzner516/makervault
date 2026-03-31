# DONE.md - Completed Features & Changes
# Updated automatically at every Claude Code session wrap.

## 2026-03-28
- Barcode and QR code scanning with MV: prefix deep-linking to parts, categories, and locations
- QR label generator with 3 sizes and Phomemo D30 printer support
- Per-supplier Gemini price estimates on Where to Buy screen
- Octopart live data integration on part detail (specs, datasheets, product images)
- Wishlist workflow screen
- "Find Item in Cabinet" AR camera screen
- Robotics category added as 8th category with 24 subcategories (Supabase migration)
- Curated project catalog replacing Instructables API (offline-capable)
- Category color-coding system (lib/categoryColors.ts)
- Estimated price field added to Gemini identification prompts (single + bulk)

## 2026-03-20
- Categorization overhaul: Gemini prompt rewritten as maker/workshop inventory identifier covering all 8 categories
- 200+ keyword matching rules across 7 categories for legacy item search
- Category drill-down now checks exact match first, then keyword fallback
- Fix category drill-down counts showing wrong numbers
- Fix inventory filtering for category views

## 2026-03-18
- Fix voice assistant hanging on STT recognition
- Fix category counts showing wrong numbers on search screen
- Add "Where to Buy" button on scan confirmation screen (no inventory save required)
- Fix home launcher card text splitting (INVENTORY no longer wraps)
- Prevent word splitting on all buttons, badges, pills, and nav labels
- Lazy-load expo-sharing and expo-file-system to prevent launch crash
- Fix expo-document-picker crash on launch
- Fix double-save on confirm screen and smarter supplier search queries
- Auth screen with email/password sign in and sign up
- Duplicate detection: scans check for existing parts and offer merge
- CSV and JSON export via Share API in Settings
- CSV import screen with flexible header mapping
- Voice overlay component with pulsing mic animation
- Haptic feedback helper that checks settings before firing
- Search history synced to Supabase
- QR code print and share via expo-sharing
- Accelerometer re-enabled with try/catch fallback to timer
- Deep-dive Q&A document (52 questions answered from codebase)

## 2026-03-17
- Features page added with complete list of all app capabilities
- Revise features page: remove affiliate refs, reorder sections, add QR printing
- Fix filter pills being cut off: increased padding and min height
- Session 2 documentation: changelog, memory files, updated CLAUDE.md
- Persist scans to AsyncStorage after every state change
- Preserve old unconfirmed scans across new scan sessions
- Fix auto-scan loop by eliminating all stale closures
- Add auto-scan timing settings with user-configurable delays
- Faster handheld auto-scan (2s vs 3.5s for stand mode)
- Remove expo-sensors entirely (crashes current dev build)
- Fix handheld sensitivity and simplify stand mode
- Fix accelerometer crash with graceful fallback to scene detection
- On Stand mode: scene change detection via tiny brightness snapshots
- Split auto-scan into Handheld and On Stand modes
- Replace snapshot motion detection with accelerometer-based detection
- Replace cooldown timer with real motion detection for auto-scan
- Make auto mode truly automatic (no taps needed after first start)
- Fix auto-scan stuck on capturing (stale closure issue)
- Pin viewfinder to absolute screen center (immune to flex layout changes)
- Fix mode button text, pending scans persistence, and viewfinder centering
- Fix viewfinder centering, auto-detect flow, colors, and pending scans tile
- VaultSplash trace animation added
- Auto-scan UX fixes and image quality upgrade

## 2026-03-16
- Complete visual overhaul: 10 research-backed color themes (no orange/amber)
- UIKit component library (Level 3: Machined Metal aesthetic)
- ThemeContext with AsyncStorage persistence and useTheme hook
- 5-tab navigation: Home launcher, Search, Scan, Inventory, Projects
- Supplier system: 15 suppliers with favourites, country filtering, affiliate codes
- Category system: 7 categories with subcategories (Supabase migration)
- Scan quality presets: Fast, Balanced, Detailed, Maximum
- Part detail screen with inline editing of all fields
- Camera scan to Gemini 2.5 Flash to confirm to save with thumbnail pipeline
- VaultSplash cinematic vault-door opening animation
- Settings screen with themes, scan quality, and supplier management
- Smart supplier URL builder with affiliate code injection
- Where to Buy and All Suppliers screens
- ThemePicker with mini phone mockups
- Design system documentation, affiliate setup guide, and usability audit
- Minimum 14px font size enforced across entire app
- Updated project documentation: CLAUDE.md, SETUP.md, CHANGELOG.md

## 2026-03-15
- Replace @react-native-voice/voice with expo-speech-recognition
- Initial project commit: Expo Router app scaffold with tabs, camera scan, Gemini AI identification, confirm screen, inventory CRUD, part detail, locations management, project ideas, reorder screen, Supabase backend with migrations and RLS policies, agent workspace structure
