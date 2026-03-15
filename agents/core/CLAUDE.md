# Agent: Core Infrastructure

## Responsibility
This agent owns the foundation everything else is built on:
- Supabase project setup and database schema
- Authentication (email + Google OAuth)
- Shared TypeScript data models and types
- Zustand stores (global state)
- Supabase client configuration
- Shared utility functions

## Database Schema

### Tables

**parts**
```sql
id uuid primary key
user_id uuid references auth.users
name text not null
manufacturer text
mpn text                        -- Manufacturer Part Number
category text                   -- resistor, capacitor, IC, cable, etc.
subcategory text
description text
specs jsonb                     -- { voltage: "5V", resistance: "10k", etc. }
quantity int default 0
low_stock_threshold int default 5
image_url text                  -- stored in Supabase Storage
datasheet_url text
notes text
created_at timestamptz default now()
updated_at timestamptz default now()
```

**storage_locations**
```sql
id uuid primary key
user_id uuid references auth.users
name text not null              -- "Blue Tackle Box", "Pegboard Wall"
parent_id uuid references storage_locations(id)  -- for nested locations
qr_code text                    -- unique QR identifier
description text
created_at timestamptz default now()
```

**part_locations**
```sql
id uuid primary key
part_id uuid references parts(id)
location_id uuid references storage_locations(id)
quantity int default 0          -- quantity at this specific location
```

**suppliers**
```sql
id uuid primary key
name text                       -- Amazon, DigiKey, Mouser, etc.
base_url text
affiliate_tag text
api_key_env_var text            -- env var name holding the key
```

**part_supplier_links**
```sql
id uuid primary key
part_id uuid references parts(id)
supplier_id uuid references suppliers(id)
supplier_part_number text
product_url text
last_price numeric
last_checked_at timestamptz
in_stock boolean
```

**projects**
```sql
id uuid primary key
user_id uuid references auth.users
title text not null
description text
difficulty text                 -- beginner, intermediate, advanced
estimated_hours int
source_url text                 -- Instructables, Hackster, GitHub
source text                     -- instructables, hackster, ai_generated
status text default 'idea'      -- idea, in_progress, completed
created_at timestamptz default now()
```

**project_parts**
```sql
id uuid primary key
project_id uuid references projects(id)
part_id uuid references parts(id)
quantity_needed int
quantity_owned int              -- snapshot at time of suggestion
notes text
```

**wishlist**
```sql
id uuid primary key
user_id uuid references auth.users
name text not null
mpn text
category text
notes text
preferred_supplier text
created_at timestamptz default now()
```

**search_history**
```sql
id uuid primary key
user_id uuid references auth.users
query text
result_count int
created_at timestamptz default now()
```

## Zustand Stores

### authStore (`/lib/zustand/authStore.ts`)
```typescript
interface AuthStore {
  user: User | null
  session: Session | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setSession: (session: Session | null) => void
}
```

### inventoryStore (`/lib/zustand/inventoryStore.ts`)
```typescript
interface InventoryStore {
  parts: Part[]
  isLoading: boolean
  fetchParts: () => Promise<void>
  addPart: (part: NewPart) => Promise<void>
  updatePart: (id: string, updates: Partial<Part>) => Promise<void>
  deletePart: (id: string) => Promise<void>
  decrementQuantity: (id: string, amount: number) => Promise<void>
}
```

### searchStore (`/lib/zustand/searchStore.ts`)
```typescript
interface SearchStore {
  query: string
  results: Part[]
  isSearching: boolean
  recentSearches: string[]
  setQuery: (query: string) => void
  search: (query: string) => Promise<void>
  clearResults: () => void
}
```

### voiceStore (`/lib/zustand/voiceStore.ts`)
```typescript
interface VoiceStore {
  isListening: boolean
  transcript: string
  isProcessing: boolean
  startListening: () => void
  stopListening: () => void
  processIntent: (text: string) => Promise<VoiceIntent>
}
```

## Shared Types (`/lib/types.ts`)
Define all shared TypeScript interfaces here. Every agent imports from this file — never redefine types locally.

## Files to Create
- `/lib/supabase.ts` — Supabase client singleton
- `/lib/types.ts` — All shared TypeScript types
- `/lib/zustand/authStore.ts`
- `/lib/zustand/inventoryStore.ts`
- `/lib/zustand/searchStore.ts`
- `/lib/zustand/voiceStore.ts`
- `/supabase/migrations/001_initial_schema.sql`
- `/supabase/migrations/002_rls_policies.sql` — Row Level Security

## RLS Policies
All tables must have Row Level Security enabled. Users can only read/write their own data:
```sql
alter table parts enable row level security;
create policy "Users can manage own parts"
  on parts for all using (auth.uid() = user_id);
```
Apply same pattern to all user-owned tables.

## Dependencies to Install
```bash
npx expo install @supabase/supabase-js
npx expo install zustand
npx expo install @react-native-async-storage/async-storage
```
