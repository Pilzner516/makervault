# MakerVault — Claude Code Master Guide

## Project Overview
MakerVault is a React Native (Expo) mobile app for electronics makers to:
- Photograph and AI-identify electronic components
- Track parts inventory with storage locations
- Search inventory using natural language
- Get project ideas based on owned parts
- Reorder parts via Amazon, DigiKey, Mouser, Adafruit, AliExpress
- Interact hands-free via voice

## Tech Stack
- **Language**: TypeScript (strict mode)
- **Framework**: React Native via Expo SDK 54
- **State Management**: Zustand
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions)
- **Navigation**: Expo Router (file-based)
- **Styling**: NativeWind (Tailwind for React Native)
- **AI Vision**: Google Gemini Vision API
- **Voice**: expo-speech + react-native-voice
- **Parts Data**: Octopart API
- **Build**: EAS Build (Expo Application Services)
- **CI/CD**: GitHub Actions + EAS

## Target Platforms
- Android (primary — build and test first)
- iOS (parallel support, test second)

## Repository Structure
```
makervault/
├── CLAUDE.md                  # This file
├── app/                       # Expo Router screens
│   ├── (tabs)/
│   │   ├── index.tsx          # Home / dashboard
│   │   ├── scan.tsx           # Camera scan screen
│   │   ├── inventory.tsx      # Parts inventory
│   │   ├── search.tsx         # Search screen
│   │   └── projects.tsx       # Project ideas
│   ├── part/[id].tsx          # Part detail screen
│   ├── confirm.tsx            # AI confirmation screen
│   └── _layout.tsx
├── components/                # Shared UI components
├── agents/                    # Claude Code agent workspaces
│   ├── core/CLAUDE.md
│   ├── camera-ai/CLAUDE.md
│   ├── inventory/CLAUDE.md
│   ├── voice/CLAUDE.md
│   ├── supplier/CLAUDE.md
│   └── project-engine/CLAUDE.md
├── lib/                       # Shared utilities
│   ├── supabase.ts
│   ├── gemini.ts
│   ├── octopart.ts
│   └── zustand/               # Zustand stores
├── supabase/
│   ├── migrations/            # DB schema migrations
│   └── functions/             # Edge functions
├── assets/
├── constants/
├── hooks/
├── app.json
├── eas.json
├── tailwind.config.js
└── tsconfig.json
```

## Environment Variables
Store in `.env.local` (never commit):
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
OCTOPART_API_KEY=
AMAZON_ASSOCIATE_TAG=
DIGIKEY_CLIENT_ID=
DIGIKEY_CLIENT_SECRET=
MOUSER_API_KEY=
```

## Coding Standards
- TypeScript strict mode — no `any` types
- Functional components only — no class components
- All API calls go through `/lib` utilities, never inline
- Zustand stores live in `/lib/zustand/`
- NativeWind for all styling — no StyleSheet.create()
- Expo Router for all navigation — no React Navigation directly
- Android-first: test on Android before iOS
- Handle permissions explicitly for camera and microphone

## Agent Responsibilities
Each agent has its own CLAUDE.md in `/agents/[name]/`:
- **core** — Supabase schema, auth, shared data models, Zustand stores
- **camera-ai** — Camera capture, Gemini Vision, part confirmation UI
- **inventory** — CRUD operations, storage locations, QR codes, alerts
- **voice** — Speech-to-text, intent parsing, TTS responses
- **supplier** — Octopart, Amazon, DigiKey, Mouser, affiliate links
- **project-engine** — Project ideas, Instructables API, build history

## Key User Flows
1. **Scan a part** → camera → Gemini identifies → confirmation screen → saved to inventory
2. **Search inventory** → natural language → LLM parses intent → results or shop flow
3. **Voice query** → mic button → STT → intent parse → spoken + visual response
4. **Reorder** → part detail → supplier comparison → affiliate deep link
5. **Project ideas** → inventory analyzed → AI suggests buildable projects
