# MakerVault — Setup Guide

## Prerequisites
- Node.js 18+
- Git + GitHub account (already set up ✅)
- Android device or emulator for testing
- Expo Go app on your Android device (for development)

## Step 1: Create Supabase Project
1. Go to https://supabase.com and sign up (free tier is fine to start)
2. Click "New Project"
3. Name it `makervault`
4. Choose a strong database password (save it!)
5. Select region closest to you
6. Wait ~2 minutes for project to spin up
7. Go to Settings → API
8. Copy your `Project URL` and `anon public` key — you'll need these

## Step 2: Initialize Expo Project
```bash
# Create new Expo project
npx create-expo-app makervault --template tabs

cd makervault

# Install core dependencies
npx expo install @supabase/supabase-js
npx expo install zustand
npx expo install @react-native-async-storage/async-storage
npx expo install nativewind
npx expo install tailwindcss

# Install agent-specific dependencies
npx expo install expo-camera
npx expo install expo-image-manipulator
npx expo install expo-haptics
npx expo install expo-image-picker
npx expo install @react-native-voice/voice
npx expo install expo-speech
npx expo install expo-linking
npx expo install expo-web-browser
npx expo install expo-notifications
npx expo install expo-barcode-scanner
npx expo install react-native-qrcode-svg
npx expo install @shopify/flash-list
```

## Step 3: Environment Variables
Create `.env.local` in project root:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=get_from_google_ai_studio
OCTOPART_API_KEY=get_from_nexar.com
AMAZON_ASSOCIATE_TAG=your_associate_tag
DIGIKEY_CLIENT_ID=get_from_digikey_developer_portal
DIGIKEY_CLIENT_SECRET=get_from_digikey_developer_portal
MOUSER_API_KEY=get_from_mouser_developer_portal
```

## Step 4: API Keys Checklist
- [ ] **Gemini API** → https://aistudio.google.com/app/apikey (free tier available)
- [ ] **Octopart/Nexar API** → https://nexar.com/api (free tier: 1000 queries/month)
- [ ] **Amazon Associates** → https://affiliate-program.amazon.com
- [ ] **DigiKey API** → https://developer.digikey.com
- [ ] **Mouser API** → https://www.mouser.com/api-hub/

## Step 5: GitHub Repo
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

## Step 6: Run on Android
```bash
# Start development server
npx expo start

# Press 'a' to open on Android emulator
# Or scan QR code with Expo Go app on your Android device
```

## Step 7: EAS Build Setup (for production APK)
```bash
npm install -g eas-cli
eas login
eas build:configure

# Build Android APK for testing
eas build --platform android --profile preview
```

## Claude Code Agent Workflow
Each agent has a CLAUDE.md in `/agents/[name]/`. When working with Claude Code:

1. Open Claude Code in your terminal: `claude`
2. Point it to the relevant agent: "Read agents/camera-ai/CLAUDE.md and implement the scan screen"
3. Claude Code will build within the guidelines defined in that agent's CLAUDE.md
4. Always run on Android device to verify after each agent's work

## Agent Build Order (recommended)
1. **core** — Must be done first (schema + auth + stores)
2. **inventory** — Foundation for all other agents
3. **camera-ai** — Core value prop
4. **voice** — Layered on top of inventory
5. **supplier** — Layered on top of inventory + camera-ai
6. **project-engine** — Requires full inventory data

## Folder Structure to Create Manually
```
makervault/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx
│   │   ├── scan.tsx
│   │   ├── inventory.tsx
│   │   ├── search.tsx
│   │   └── projects.tsx
│   ├── part/
│   │   └── [id].tsx
│   ├── confirm.tsx
│   └── _layout.tsx
├── components/
│   └── VoiceFAB.tsx
├── lib/
│   ├── supabase.ts
│   ├── gemini.ts
│   ├── octopart.ts
│   ├── search.ts
│   ├── projectEngine.ts
│   ├── types.ts
│   └── zustand/
│       ├── authStore.ts
│       ├── inventoryStore.ts
│       ├── searchStore.ts
│       └── voiceStore.ts
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_rls_policies.sql
│   └── functions/
│       └── refresh-prices/
│           └── index.ts
├── agents/
│   ├── core/CLAUDE.md ✅
│   ├── camera-ai/CLAUDE.md ✅
│   ├── inventory/CLAUDE.md ✅
│   ├── voice/CLAUDE.md ✅
│   ├── supplier/CLAUDE.md ✅
│   └── project-engine/CLAUDE.md ✅
└── CLAUDE.md ✅
```
