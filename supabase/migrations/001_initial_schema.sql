-- MakerVault initial database schema

-- Parts inventory
create table parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  manufacturer text,
  mpn text,
  category text,
  subcategory text,
  description text,
  specs jsonb,
  quantity int default 0,
  low_stock_threshold int default 5,
  image_url text,
  datasheet_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_parts_user_id on parts (user_id);
create index idx_parts_category on parts (category);
create index idx_parts_name on parts using gin (name gin_trgm_ops);

-- Storage locations (supports nesting)
create table storage_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  parent_id uuid references storage_locations(id),
  qr_code text unique,
  description text,
  created_at timestamptz default now()
);

create index idx_storage_locations_user_id on storage_locations (user_id);

-- Junction: parts <-> locations (a part can be split across locations)
create table part_locations (
  id uuid primary key default gen_random_uuid(),
  part_id uuid references parts(id) on delete cascade,
  location_id uuid references storage_locations(id) on delete cascade,
  quantity int default 0
);

create index idx_part_locations_part on part_locations (part_id);
create index idx_part_locations_location on part_locations (location_id);

-- Suppliers
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_url text,
  affiliate_tag text,
  api_key_env_var text
);

-- Supplier links per part
create table part_supplier_links (
  id uuid primary key default gen_random_uuid(),
  part_id uuid references parts(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete cascade,
  supplier_part_number text,
  product_url text,
  last_price numeric,
  last_checked_at timestamptz,
  in_stock boolean
);

create index idx_part_supplier_links_part on part_supplier_links (part_id);

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  estimated_hours int,
  source_url text,
  source text check (source in ('instructables', 'hackster', 'ai_generated')),
  status text default 'idea' check (status in ('idea', 'in_progress', 'completed')),
  created_at timestamptz default now()
);

create index idx_projects_user_id on projects (user_id);

-- Project parts (BOM)
create table project_parts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  part_id uuid references parts(id) on delete cascade,
  quantity_needed int,
  quantity_owned int,
  notes text
);

-- Wishlist
create table wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  mpn text,
  category text,
  notes text,
  preferred_supplier text,
  created_at timestamptz default now()
);

create index idx_wishlist_user_id on wishlist (user_id);

-- Search history
create table search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  query text,
  result_count int,
  created_at timestamptz default now()
);

-- Seed default suppliers
insert into suppliers (name, base_url, affiliate_tag, api_key_env_var) values
  ('Amazon', 'https://www.amazon.com', null, null),
  ('DigiKey', 'https://www.digikey.com', null, 'DIGIKEY_CLIENT_ID'),
  ('Mouser', 'https://www.mouser.com', null, 'MOUSER_API_KEY'),
  ('Adafruit', 'https://www.adafruit.com', null, null),
  ('AliExpress', 'https://www.aliexpress.com', null, null);
