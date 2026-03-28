# MakerVault -- Claude Code Master Guide

## Project Overview
MakerVault is a React Native (Expo) mobile app for electronics makers to:
- Photograph and AI-identify electronic components (Gemini 2.5 Flash)
- Track parts inventory with storage locations and categories
- Search inventory using natural language and category cards
- Get project ideas based on owned parts
- Reorder parts via 15 suppliers with affiliate link support
- Interact hands-free via voice (expo-speech-recognition)
- Choose from 10 research-backed color themes

## Tech Stack
- **Language**: TypeScript (strict mode)
- **Framework**: React Native via Expo SDK 54
- **State Management**: Zustand (5 stores)
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions)
- **Navigation**: Expo Router (file-based, 5-tab layout)
- **Styling**: NativeWind (Tailwind for React Native) + UIKit component library
- **Theming**: ThemeContext with 10 themes, AsyncStorage persistence
- **AI Vision**: Google Gemini 2.5 Flash (with fallback chain: 2.5-flash -> 2.0-flash -> 1.5-flash)
- **Voice STT**: expo-speech-recognition (replaced @react-native-voice/voice)
- **Voice TTS**: expo-speech
- **Parts Data**: Octopart API
- **Images**: expo-camera, expo-image-picker, expo-image-manipulator, expo-image
- **Gradient**: expo-linear-gradient (installed, disabled until dev build includes native module)
- **Build**: EAS Build (dev builds, not Expo Go) via expo-dev-client
- **CI/CD**: GitHub Actions + EAS

## Target Platforms
- Android (primary -- build and test first)
- iOS (parallel support, test second)

## Repository Structure
```
makervault/
├── CLAUDE.md                  # This file
├── SETUP.md                   # Setup guide
├── Docs/
│   ├── AFFILIATE_SETUP.md     # Affiliate program signup instructions
│   ├── CHANGELOG.md           # Session changelog
│   ├── CLAUDE_CODE_INSTRUCTIONS.md
│   ├── DESIGN_SYSTEM.md       # Level 3 Machined Metal design spec
│   └── USABILITY_AUDIT.md     # Touch target & font size audit
├── app/
│   ├── _layout.tsx            # Root layout: ThemeProvider, VaultSplash, Stack
│   ├── (tabs)/
│   │   ├── _layout.tsx        # 5-tab layout (Home, Search, Scan, Inventory, Projects)
│   │   ├── index.tsx          # Home: logo header, stat strip, 6-card launcher grid
│   │   ├── search.tsx         # Search: category cards, keyword search, results list
│   │   ├── scan.tsx           # Camera: AI Identify, Multi, Barcode, Manual modes
│   │   ├── inventory.tsx      # Parts list with filters and search
│   │   ├── projects.tsx       # Project ideas
│   │   └── explore.tsx        # Hidden (legacy, href: null)
│   ├── confirm.tsx            # AI confirmation: single + bulk scan with add/skip
│   ├── part/[id].tsx          # Part detail with inline editing, quantity, suppliers
│   ├── where-to-buy.tsx       # Supplier list for a specific part (favourites, MV preferred)
│   ├── all-suppliers.tsx      # Full supplier directory with country filter
│   ├── modal.tsx              # Settings: themes, scan quality, country, suppliers, affiliates
│   ├── locations.tsx          # Storage location management
│   ├── reorder.tsx            # Price comparison
│   ├── wishlist.tsx           # Wishlist screen
│   ├── qr-labels.tsx          # QR label generator/export (3 sizes, Phomemo D30)
│   ├── find-item.tsx          # "Find Item in Cabinet" AR camera
│   └── project/[id].tsx       # Project detail
├── components/
│   ├── UIKit.tsx              # Full component library (Level 3 Machined Metal)
│   ├── ThemePicker.tsx        # Theme swatch picker with mini phone mockups
│   ├── VaultSplash.tsx        # Cinematic vault-door opening animation
│   ├── VoiceFAB.tsx           # Voice FAB (legacy, voice now in home launcher)
│   ├── AddPartSheet.tsx       # Manual part add bottom sheet
│   ├── LocationTree.tsx       # Hierarchical location picker
│   ├── PartCard.tsx           # Part card component
│   ├── QRCodeLabel.tsx        # Universal QR label (location/category/part, 3 sizes, MV:{id} format)
│   ├── QuantityAdjuster.tsx   # +/- quantity control
│   └── ui/                    # Base UI primitives (collapsible, icon-symbol)
├── context/
│   └── ThemeContext.tsx        # Theme provider + useTheme hook (10 themes, AsyncStorage)
├── constants/
│   ├── themes.ts              # 10 theme definitions (zero orange/amber)
│   └── theme.ts               # Legacy theme constants + ELECTRIC_BLUE brand color
├── lib/
│   ├── gemini.ts              # Gemini 2.5 Flash: identifyPart, identifyBulkParts, generateJSON
│   ├── image.ts               # preprocessImage, createThumbnailDataUri, simpleHash
│   ├── supabase.ts            # Supabase client + isSupabaseConfigured helper
│   ├── search.ts              # Smart search: Gemini NL parsing + keyword fallback + synonyms
│   ├── suppliers.ts           # Supplier configs, affiliate URLs, search URLs
│   ├── octopart.ts            # Octopart API integration
│   ├── voice.ts               # expo-speech-recognition wrapper (STT)
│   ├── tts.ts                 # expo-speech wrapper (TTS)
│   ├── notifications.ts       # Low stock alerts + getLowStockParts
│   ├── projectEngine.ts       # Project idea generation
│   ├── types.ts               # Shared types (Part, Project, GeminiIdentification, etc.)
│   └── zustand/
│       ├── authStore.ts       # Auth state (signIn, signUp, signOut, anonymous)
│       ├── inventoryStore.ts  # Parts CRUD, fetchParts, addPart, updatePart, deletePart
│       ├── searchStore.ts     # Search state
│       ├── settingsStore.ts   # Scan quality (4 presets), alerts, voice, haptics
│       ├── supplierStore.ts   # 15 suppliers, favourites, country filter, affiliate codes
│       └── voiceStore.ts      # Voice conversation state
├── hooks/
│   ├── use-color-scheme.ts
│   ├── use-color-scheme.web.ts
│   └── use-theme-color.ts
├── agents/                    # Claude Code agent workspaces
│   ├── core/CLAUDE.md
│   ├── camera-ai/CLAUDE.md
│   ├── inventory/CLAUDE.md
│   ├── voice/CLAUDE.md
│   ├── supplier/CLAUDE.md
│   └── project-engine/CLAUDE.md
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql          # Parts, locations, suppliers, projects tables
│   │   ├── 002_rls_policies.sql            # Row-level security policies
│   │   ├── 20260316000000_category_system.sql  # categories + subcategories tables + seed data
│   │   ├── 20260316000001_supplier_system.sql  # Supplier metadata, user prefs, user settings + 15 suppliers
│   │   └── 20260319000000_add_robotics_category.sql  # Robotics category + 24 subcategories
│   └── functions/
│       └── refresh-prices/index.ts
├── assets/
├── app.json                   # Expo config (expo-speech-recognition, expo-camera, expo-image-picker)
├── eas.json                   # EAS Build profiles (development, preview, production)
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── global.css
```

## Theme System
10 themes, zero orange/amber. Each has 7 background layers, 5-tier text hierarchy, WCAG AA contrast:
1. **Midnight Workshop** (default) -- Deep blue-black + electric blue
2. **Solder Smoke** -- Warm charcoal + teal
3. **Circuit Noir** -- True OLED black + vivid violet
4. **PCB Green** -- Dark green + hot pink
5. **Oscilloscope** -- Phosphor green glow (retro terminal)
6. **Titanium** -- Cool steel gray + indigo
7. **Neon Lab** -- Neutral dark + vivid cyan
8. **Forge** -- Warm charcoal + magenta-rose
9. **Deep Space** -- Purple void + starlight blue
10. **Graphene** -- Carbon green-gray + lime-chartreuse

All color values come from `useTheme()` -- never hardcode hex values.

## UIKit Component Library
All UI components live in `components/UIKit.tsx` (Level 3: Machined Metal aesthetic).
Key components: ScreenLayout, LogoHeader, ScreenHeader, HeaderPanel, PanelCard, ItemRow, StatTile, StatStrip, MetricTile, MetricRow, EngravingLabel, Badge, FilterPill, FilterPillRow, ModeButton, SearchBar, FormField, FieldRow, PrimaryButton, SecondaryButton, AlertBanner, LocationRow, ProjectCard, TagChip, ScanViewfinder, ScanResultCard, BottomNav, EmptyState, Divider.

Signature details: PanelBevelTop/Bottom (machined metal edge), PanelRivets (screwhead corners), InsetTint (gradient tint in tiles), EngravingLabel (flanked section headers).

Font size minimum: 14px across all screens. Touch target minimum: 44px.

## Features Page (MANDATORY UPDATE)
The file `app/features.tsx` contains a user-facing list of ALL app features. The `FEATURE_SECTIONS` array at the top of the file defines every feature grouped by category.

**RULE: When any agent adds, modifies, or removes a feature, they MUST update `app/features.tsx` to reflect the change.** This includes:
- Adding a new feature entry when building something new
- Updating a feature description when behavior changes
- Removing a feature entry if functionality is removed
- Keeping the version number current

The Features screen is accessible from Settings (top of the page, "ALL FEATURES" button). It should always be an accurate, complete description of what MakerVault can do.

## Scan Quality Presets
4 levels configured in settingsStore, all using Gemini 2.5 Flash:
- **Fast**: 512px, 60% JPEG, basic prompt (~1.5s, ~65%)
- **Balanced** (default): 1024px, 80% JPEG, enhanced prompt (~3s, ~80%)
- **Detailed**: 1536px, 90% JPEG, enhanced prompt (~5s, ~90%)
- **Maximum**: 2048px, 95% JPEG, enhanced prompt (~8s, ~95%)

## Supplier System
15 suppliers seeded via migration, organized by tier:
- **MV Preferred** (top 4): Amazon, DigiKey, Mouser, McMaster-Carr
- **Electronics specialists**: Adafruit, SparkFun, Arrow, Newark, Jameco, LCSC
- **General/hardware**: AliExpress, Home Depot, Micro Center
- **UK/International**: RS Components, Farnell

Features: user favourites (max 4), country filtering (US/UK/CA/AU/Global), affiliate codes (Amazon Associates, AvantLink, Impact), URL templates with search query substitution.

## Category System
8 categories with color-coded badges (seeded via migration, colors in `lib/categoryColors.ts`):
- **Electronics** (#00c8e8): Microcontrollers, Resistors, Capacitors, Switches, LEDs, Displays, Sensors, Power supply, Connectors, Modules
- **Robotics** (#e879f9): Robot Kits, Servo Motors, Stepper Motors, DC Motors, Motor Drivers, ESCs, Wheels & Tires, Chassis & Frames, Robotic Arms, Grippers, Actuators, Lidar, Drone Parts, Flight Controllers, etc.
- **Fasteners** (#38bdf8): Bolts & screws, Nuts, Washers, Standoffs, Rivets, Anchors
- **Tools** (#32d47a): Hand tools, Power tools, Measuring, Soldering, Cutting, Clamps & vises
- **3D Printing** (#a78bfa): Filament PLA/PETG/ABS, Resin, Bed adhesive, Nozzles, Print beds
- **Materials** (#f05032): Aluminium stock, Steel stock, Timber, Acrylic, Foam, Adhesives, Consumables
- **Mechanical** (#60a5fa): Bearings, Belts & pulleys, Springs, Gears, Linear rails, Motors, Couplings
- **Safety & PPE** (#94a3b8): Eye protection, Gloves, Ear protection, Masks & respirators

## Environment Variables
Store in `.env.local` (never commit):
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GEMINI_API_KEY=
OCTOPART_API_KEY=
AMAZON_ASSOCIATE_TAG=
DIGIKEY_CLIENT_ID=
DIGIKEY_CLIENT_SECRET=
MOUSER_API_KEY=
```

## Coding Standards
- TypeScript strict mode -- no `any` types
- Functional components only -- no class components
- All API calls go through `/lib` utilities, never inline
- Zustand stores live in `/lib/zustand/`
- All UI uses UIKit components from `components/UIKit.tsx`
- All colors from `useTheme()` -- never hardcode hex values
- Expo Router for all navigation -- no React Navigation directly
- Android-first: test on Android before iOS
- Handle permissions explicitly for camera and microphone
- Font size minimum 14px, touch target minimum 44px
- Dev builds via EAS (`npx eas build`), not Expo Go

## Agent Responsibilities
Each agent has its own CLAUDE.md in `/agents/[name]/`:
- **core** -- Supabase schema, auth (including anonymous), shared data models, Zustand stores, ThemeContext
- **camera-ai** -- Camera capture, Gemini Vision (2.5 Flash), scan quality presets, confirm screen, bulk scan, thumbnails
- **inventory** -- CRUD operations, storage locations, QR codes, alerts, category system
- **voice** -- expo-speech-recognition STT, intent parsing, expo-speech TTS responses
- **supplier** -- 15 suppliers, favourites, country filter, affiliate codes, where-to-buy, all-suppliers screens
- **project-engine** -- Project ideas, Instructables API, build history

## Key User Flows
1. **Scan a part** -> camera (AI Identify / Multi / Barcode / Manual) -> Gemini identifies -> confirmation screen (with alternatives) -> saved to inventory with thumbnail
2. **Bulk scan** -> Multi mode -> Gemini identifies multiple items -> add/skip per item -> batch save
3. **Search inventory** -> category cards or keyword search -> Gemini NL parsing with synonym expansion -> results
4. **Voice query** -> Voice card on home -> expo-speech-recognition STT -> intent parse -> spoken + visual response
5. **Reorder** -> part detail -> "Where to Buy" -> supplier comparison with favourites/MV preferred -> affiliate deep link
6. **Project ideas** -> inventory analyzed -> AI suggests buildable projects
7. **Settings** -> themes (10 options), scan quality (4 presets), country, supplier favourites, affiliate codes

## Navigation Structure
5 tabs: Home | Search | Scan | Inventory | Projects

Stack screens: confirm, part/[id], where-to-buy, all-suppliers, modal (Settings), locations, reorder, wishlist, project/[id]

## VaultSplash Animation
Cinematic launch sequence on app start: grid fade-in -> corner markers -> vault door spring-in -> dial combination spin (3 rotations) -> latch unlock (3 sequential) -> door swing open (3D perspective) -> flash -> home screen zoom-in from center -> splash fade-out.
