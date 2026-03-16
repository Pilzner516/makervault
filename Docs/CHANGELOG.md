# MakerVault -- Changelog

## 2026-03-16 -- Initial Build Session

### Android Crash Fixes
- Fixed "window is not defined" crash by adding `Platform.OS` checks for web-only APIs
- Added platform-safe imports throughout (expo-haptics, expo-speech-recognition, expo-file-system)
- Fixed NativeWind babel configuration for Expo SDK 54 compatibility
- All native module imports wrapped in try/catch with graceful fallbacks

### Theme System -- 10 Research-Backed Color Themes
- Replaced single dark industrial theme with 10 distinct themes
- Each theme has 7 background layers, 5-tier text hierarchy, WCAG AA contrast
- Zero orange/amber across all themes (per design decision)
- Themes: Midnight Workshop (default), Solder Smoke, Circuit Noir, PCB Green, Oscilloscope, Titanium, Neon Lab, Forge, Deep Space, Graphene
- Theme definitions in `constants/themes.ts` with full TypeScript interfaces
- ThemeContext provider in `context/ThemeContext.tsx` with AsyncStorage persistence
- ThemePicker component with mini phone mockups showing each theme's colors
- All components read colors from `useTheme()` -- no hardcoded hex values

### UIKit Component Library (Level 3: Machined Metal)
- Full component library in `components/UIKit.tsx`
- Signature details: PanelBevelTop/Bottom (machined metal edge shimmer), PanelRivets (screwhead corners), InsetTint (gradient tint in tiles), EngravingLabel (flanked section headers)
- Components: ScreenLayout, LogoHeader, ScreenHeader, HeaderPanel, PanelCard, ItemRow, StatTile, StatStrip, MetricTile, MetricRow, EngravingLabel, Badge, FilterPill, FilterPillRow, ModeButton, SearchBar, FormField, FieldRow, PrimaryButton, SecondaryButton, AlertBanner, LocationRow, ProjectCard, TagChip, ScanViewfinder, ScanResultCard, BottomNav, EmptyState, Divider
- expo-linear-gradient: installed but disabled (`SafeGradient` fallback renders flat colors until dev build includes native module)

### Scan Flow
- Camera screen with 4 modes: AI Identify, Multi (bulk), Barcode, Manual
- Live camera via expo-camera with flash toggle and gallery picker
- Expo Go detection: falls back to image picker when camera unavailable
- Confirm screen: shows captured image, Gemini AI analysis with loading state
- Single part: displays name, manufacturer, MPN, category, specs, markings, confidence badge
- Alternative suggestions: horizontal pill selector to switch between AI suggestions
- Low confidence warning for results below 60%
- Bulk scan: Gemini identifies multiple parts in one image, add/skip per item
- Thumbnail generation (200px, 25% JPEG) stored as data URI with parts

### Scan Quality Presets
- 4 levels in settingsStore: Fast, Balanced (default), Detailed, Maximum
- Configures image resolution (512-2048px), JPEG quality (60-95%), and prompt complexity
- All use Gemini 2.5 Flash with fallback chain (2.5-flash -> 2.0-flash -> 1.5-flash)
- Selectable in Settings screen with accuracy/speed indicators

### Part Detail with Inline Editing
- Full part detail screen at `app/part/[id].tsx`
- Metric tiles for quantity and low stock threshold
- QuantityAdjuster component for +/- controls
- Inline field editing for name, manufacturer, MPN, category, notes
- Part image display (from thumbnail data URI)
- Supplier links section with "Where to Buy" navigation
- Delete part with confirmation dialog

### Supplier System
- 15 suppliers seeded via Supabase migration (`20260316000001_supplier_system.sql`)
- MV Preferred tier (4): Amazon, DigiKey, Mouser, McMaster-Carr
- Electronics specialists (6): Adafruit, SparkFun, Arrow, Newark, Jameco, LCSC
- General/hardware (3): AliExpress, Home Depot, Micro Center
- UK/International (2): RS Components, Farnell
- supplierStore (Zustand): fetchAll, toggleFavourite (max 4), toggleEnabled, country filter, affiliate codes
- Where to Buy screen: prioritized list (favourites -> MV preferred -> enabled -> rest)
- All Suppliers screen: full directory with country filter pills and search
- URL templates with `{query}` and `{affiliate_code}` substitution
- Affiliate code support: Amazon Associates, Jameco AvantLink, Home Depot Impact
- User settings table: country_code, show_global, affiliate tags
- Affiliate setup guide in `Docs/AFFILIATE_SETUP.md`

### Category System
- Supabase migration (`20260316000000_category_system.sql`)
- 7 default categories: Electronics, Fasteners, Tools, 3D Printing, Materials, Mechanical, Safety & PPE
- Each category has subcategories (e.g., Electronics -> Microcontrollers, Resistors, Capacitors, etc.)
- Categories table with name, icon, colour, sort_order
- Subcategories table linked to parent category
- Parts table extended with subcategory_id foreign key

### Search Screen
- Dedicated search tab with category card grid (6 categories: Fasteners, Electronics, Tools, 3D Printing, Materials, Cables)
- Each category card shows item count from inventory
- Keyword search with real-time filtering across name, manufacturer, MPN, category, description, notes
- Smart search in `lib/search.ts`: Gemini NL parsing with synonym expansion (e.g., "BJT" -> transistor, "pot" -> potentiometer)
- Results displayed as ItemRow list with status indicators

### Home Screen -- Launcher Grid
- LogoHeader with "MakerVault / Workshop OS" branding
- StatStrip: Parts count, Projects count, Alerts count
- Low stock alert banner (when items need restocking)
- 6-card launcher grid: Scan (highlighted), Search, Inventory, Projects, Voice, Settings
- Voice card triggers expo-speech-recognition directly (no separate screen)
- Settings card navigates to modal settings screen

### Settings Screen
- Feature toggles: Low Stock Alerts, Voice Assistant, Haptic Feedback
- Scan Quality: 4 preset cards with accuracy/speed indicators and active checkmark
- Theme Picker: horizontal swatch row with mini phone mockups
- Country/Region selector: US, UK, Canada, Australia, Global + show global toggle
- Affiliate Codes: Amazon tag, Jameco AvantLink ID, Home Depot Impact ID with inline editing
- Favourite Suppliers: list with star toggle + "Manage all suppliers" link
- Account: user info display, sign out button
- About: version, Supabase status, AI Vision status

### Voice System
- Replaced `@react-native-voice/voice` with `expo-speech-recognition`
- Platform-safe import in `lib/voice.ts` (skipped on web)
- Functions: isVoiceAvailable, setupVoiceListeners, startRecognition, stopRecognition, cancelRecognition
- Moved from floating action button (VoiceFAB) to home screen launcher card
- VoiceFAB component retained but no longer rendered in root layout

### VaultSplash Animation
- Cinematic launch sequence in `components/VaultSplash.tsx`
- 8-phase animation using React Native Animated API:
  1. Grid + corner markers fade in
  2. Vault door springs in with bounce
  3. Combination dial spins (3 rotations: left 120, right 80, left 200)
  4. App name "MakerVault" fades up
  5. Loading bar fills
  6. 3 latches unlock sequentially
  7. Door swings open (simulated 3D with scaleX + translateX)
  8. Flash -> home screen zooms in -> splash fades out
- ~5 second total duration, fires onComplete callback
- Rendered as overlay in root _layout.tsx, removed after completion

### Thumbnail Image Storage
- `lib/image.ts`: preprocessImage (configurable width/quality for Gemini) and createThumbnailDataUri (200px, 25% JPEG)
- Thumbnails stored as base64 data URIs in the parts table `image_url` column
- Platform-safe base64 conversion (FileReader on web, expo-file-system File API on native)
- Displayed in ItemRow and part detail via expo-image

### Smart Search Query Builder
- `lib/gemini.ts`: IDENTIFY_PROMPT engineered to produce Amazon/eBay-style listing titles
- Rules: start with what it is (not model numbers), include purpose/size/brand, put codes in MPN field
- Prevents junk search terms like "Generic", "Unknown", "N/A"
- BULK_IDENTIFY_PROMPT for multi-item identification

### Font Size and Touch Target Audit
- Minimum font size set to 14px across all screens (UIKit FontSize.xs = 14)
- All touch targets minimum 44px (buttons, nav items, list rows)
- List rows minimum 48px
- Documented in `Docs/USABILITY_AUDIT.md`

### Dev Build Setup via EAS
- expo-dev-client added to dependencies
- eas.json configured with development, preview, and production profiles
- app.json updated with expo-speech-recognition and expo-camera plugin configurations
- Android permissions: CAMERA, READ_EXTERNAL_STORAGE, RECORD_AUDIO

### 5-Tab Navigation
- Tab layout: Home, Search, Scan, Inventory, Projects
- Each tab has Ionicons with outline/filled variants
- Active tab indicator: 2px accent-colored line above icon
- Tab bar themed via ThemeContext colors
- Legacy "explore" tab hidden (href: null)

### Database Migrations
- `001_initial_schema.sql`: Core tables (parts, storage_locations, part_locations, suppliers, part_supplier_links, projects, project_parts, wishlist_items, search_history)
- `002_rls_policies.sql`: Row-level security for all tables
- `20260316000000_category_system.sql`: categories + subcategories tables with seed data (7 categories, 44 subcategories)
- `20260316000001_supplier_system.sql`: Supplier metadata columns, user_supplier_prefs, user_settings tables, 15 supplier seed data
