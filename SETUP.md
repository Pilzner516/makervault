# MakerVault -- Setup Guide

## Prerequisites
- Node.js 18+
- Git + GitHub account
- Android device for testing (USB debugging enabled)
- EAS CLI (`npm install -g eas-cli`)
- Expo account (for EAS builds)

**Important:** MakerVault requires a dev build (not Expo Go). Several native modules (expo-camera, expo-speech-recognition, expo-linear-gradient) need a custom native build.

## Step 1: Create Supabase Project
1. Go to https://supabase.com and sign up (free tier is fine to start)
2. Click "New Project"
3. Name it `makervault`
4. Choose a strong database password (save it!)
5. Select region closest to you
6. Wait ~2 minutes for project to spin up
7. Go to Settings -> API
8. Copy your `Project URL` and `anon public` key

### Enable Anonymous Auth
1. In Supabase dashboard, go to Authentication -> Providers
2. Enable "Anonymous Sign-ins"
3. This allows the app to work without requiring email/password login

## Step 2: Initialize Expo Project
```bash
# Clone the repo (or start from scratch)
git clone https://github.com/YOUR_USERNAME/makervault.git
cd makervault

# Install dependencies
npm install

# Install core dependencies (if starting fresh)
npx expo install @supabase/supabase-js
npx expo install zustand
npx expo install @react-native-async-storage/async-storage
npx expo install nativewind tailwindcss

# Install camera & image dependencies
npx expo install expo-camera
npx expo install expo-image
npx expo install expo-image-manipulator
npx expo install expo-image-picker

# Install voice dependencies
npx expo install expo-speech
npx expo install expo-speech-recognition

# Install UI & utility dependencies
npx expo install expo-haptics
npx expo install expo-linking
npx expo install expo-web-browser
npx expo install expo-notifications
npx expo install expo-linear-gradient
npx expo install expo-dev-client
npx expo install @shopify/flash-list
npx expo install react-native-qrcode-svg
npx expo install react-native-svg

# Install Gemini AI SDK
npm install @google/generative-ai
```

### expo-linear-gradient Note
`expo-linear-gradient` is installed in package.json and listed in app.json plugins, but the native module is **disabled in UIKit.tsx** until you create a dev build that includes it. The UIKit uses a `SafeGradient` fallback that renders flat colors instead. After your first `eas build`, re-enable it by updating the `_LG` constant in `components/UIKit.tsx`.

### expo-speech-recognition Note
This replaces the older `@react-native-voice/voice` package. It requires a dev build with native modules. The app.json already includes the plugin configuration with microphone permission text.

## Step 3: Environment Variables
Create `.env.local` in project root:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GEMINI_API_KEY=get_from_google_ai_studio
OCTOPART_API_KEY=get_from_nexar.com
AMAZON_ASSOCIATE_TAG=your_associate_tag
DIGIKEY_CLIENT_ID=get_from_digikey_developer_portal
DIGIKEY_CLIENT_SECRET=get_from_digikey_developer_portal
MOUSER_API_KEY=get_from_mouser_developer_portal
```

**Note:** The Gemini API key uses `EXPO_PUBLIC_GEMINI_API_KEY` (with the `EXPO_PUBLIC_` prefix) so it is available at runtime in the Expo client.

## Step 4: API Keys Checklist
- [ ] **Gemini API** -> https://aistudio.google.com/app/apikey (free tier available, used for AI part identification)
- [ ] **Supabase** -> From your project dashboard Settings -> API
- [ ] **Octopart/Nexar API** -> https://nexar.com/api (free tier: 1000 queries/month)
- [ ] **Amazon Associates** -> https://affiliate-program.amazon.com (optional, for affiliate links)
- [ ] **DigiKey API** -> https://developer.digikey.com (optional)
- [ ] **Mouser API** -> https://www.mouser.com/api-hub/ (optional)

## Step 5: Run Supabase Migrations
Run these migrations in order via the Supabase SQL Editor (Dashboard -> SQL Editor -> New query):

1. **001_initial_schema.sql** -- Creates parts, storage_locations, part_locations, suppliers, part_supplier_links, projects, project_parts, wishlist_items, search_history tables
2. **002_rls_policies.sql** -- Row-level security policies for all tables
3. **20260316000000_category_system.sql** -- Creates categories + subcategories tables, seeds 7 categories with subcategories
4. **20260316000001_supplier_system.sql** -- Extends suppliers table with metadata columns, creates user_supplier_prefs and user_settings tables, seeds 15 suppliers

Or run all at once via CLI:
```bash
# If you have supabase CLI linked to your project:
supabase db push
```

## Step 6: EAS Build Setup (Required)
MakerVault uses native modules that require a custom dev build:

```bash
# Login to EAS
eas login

# Configure EAS (already done -- eas.json exists)
eas build:configure

# Build a development client for Android
eas build --profile development --platform android

# Install the dev build on your device
# EAS will provide a download link or QR code
```

After installing the dev build:
```bash
# Start the development server
npx expo start --dev-client

# The dev build on your phone will connect to this server
```

### Build Profiles (eas.json)
- **development** -- Dev client with debugging, internal distribution
- **preview** -- Production-like build for testing, internal distribution
- **production** -- Release build with auto-incrementing version

## Step 7: GitHub Repo
```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial MakerVault scaffold"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/makervault.git
git branch -M main
git push -u origin main
```

## Step 8: Run on Android (Dev Build)
```bash
# Start development server for dev client
npx expo start --dev-client

# On your Android device, open the MakerVault dev build app
# It will connect to the dev server automatically (same network)
# Or scan the QR code shown in terminal
```

**Do NOT use `npx expo start` without `--dev-client`** -- the app requires native modules not available in Expo Go.

## Claude Code Agent Workflow
Each agent has a CLAUDE.md in `/agents/[name]/`. When working with Claude Code:

1. Open Claude Code in your terminal: `claude`
2. Point it to the relevant agent: "Read agents/camera-ai/CLAUDE.md and implement the scan screen"
3. Claude Code will build within the guidelines defined in that agent's CLAUDE.md
4. Always run on Android device to verify after each agent's work

## Agent Build Order (recommended)
1. **core** -- Must be done first (schema + auth + stores + ThemeContext)
2. **inventory** -- Foundation for all other agents
3. **camera-ai** -- Core value prop (Gemini 2.5 Flash identification)
4. **voice** -- Layered on top of inventory (expo-speech-recognition)
5. **supplier** -- Layered on top of inventory + camera-ai (15 suppliers, affiliates)
6. **project-engine** -- Requires full inventory data

## Current File Structure
```
makervault/
├── app/
│   ├── _layout.tsx            # Root: ThemeProvider > AppLayout (Stack + VaultSplash)
│   ├── (tabs)/
│   │   ├── _layout.tsx        # 5 tabs: Home, Search, Scan, Inventory, Projects
│   │   ├── index.tsx          # Home: LogoHeader, StatStrip, 6-card launcher grid
│   │   ├── search.tsx         # Search: category cards + keyword search
│   │   ├── scan.tsx           # Camera: 4 modes (AI/Multi/Barcode/Manual)
│   │   ├── inventory.tsx      # Parts list
│   │   └── projects.tsx       # Project list
│   ├── confirm.tsx            # AI confirm (single + bulk with add/skip)
│   ├── part/[id].tsx          # Part detail with inline editing
│   ├── where-to-buy.tsx       # Supplier links for a part
│   ├── all-suppliers.tsx      # Full supplier directory
│   ├── modal.tsx              # Settings screen
│   ├── locations.tsx          # Storage locations
│   ├── reorder.tsx            # Price compare
│   ├── wishlist.tsx           # Wishlist
│   └── project/[id].tsx       # Project detail
├── components/
│   ├── UIKit.tsx              # All UI components (Level 3 Machined Metal)
│   ├── ThemePicker.tsx        # Theme swatch picker
│   ├── VaultSplash.tsx        # Launch animation
│   ├── VoiceFAB.tsx           # Legacy voice button
│   ├── AddPartSheet.tsx
│   ├── LocationTree.tsx
│   ├── PartCard.tsx
│   ├── QRCodeLabel.tsx
│   └── QuantityAdjuster.tsx
├── context/
│   └── ThemeContext.tsx        # 10 themes, AsyncStorage persistence
├── constants/
│   ├── themes.ts              # Theme definitions
│   └── theme.ts
├── lib/
│   ├── gemini.ts              # Gemini 2.5 Flash with fallback chain
│   ├── image.ts               # Image preprocessing + thumbnails
│   ├── supabase.ts
│   ├── search.ts              # Smart search with NL parsing
│   ├── suppliers.ts           # Supplier URL builders
│   ├── voice.ts               # expo-speech-recognition wrapper
│   ├── tts.ts                 # expo-speech TTS
│   ├── octopart.ts
│   ├── notifications.ts
│   ├── projectEngine.ts
│   ├── types.ts
│   └── zustand/
│       ├── authStore.ts
│       ├── inventoryStore.ts
│       ├── searchStore.ts
│       ├── settingsStore.ts   # Scan quality presets (4 levels)
│       ├── supplierStore.ts   # 15 suppliers, favourites, affiliates
│       └── voiceStore.ts
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 20260316000000_category_system.sql
│   │   └── 20260316000001_supplier_system.sql
│   └── functions/
│       └── refresh-prices/index.ts
├── agents/
│   ├── core/CLAUDE.md
│   ├── camera-ai/CLAUDE.md
│   ├── inventory/CLAUDE.md
│   ├── voice/CLAUDE.md
│   ├── supplier/CLAUDE.md
│   └── project-engine/CLAUDE.md
├── Docs/
│   ├── AFFILIATE_SETUP.md
│   ├── CHANGELOG.md
│   ├── CLAUDE_CODE_INSTRUCTIONS.md
│   ├── DESIGN_SYSTEM.md
│   └── USABILITY_AUDIT.md
└── CLAUDE.md
```
