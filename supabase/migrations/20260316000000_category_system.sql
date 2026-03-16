-- MakerVault — Category System Migration
-- File: supabase/migrations/20260316000000_category_system.sql
-- Run via: supabase db push
-- Or paste into Supabase dashboard SQL Editor

-- ─── TABLES ──────────────────────────────────────────────────────────────────

create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  icon        text not null,
  colour      text not null default '#00c8e8',
  sort_order  integer default 0,
  is_default  boolean default false,
  created_at  timestamptz default now()
);

create table if not exists subcategories (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete restrict,
  name        text not null,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

-- Add subcategory_id to parts if it doesn't exist
alter table parts
  add column if not exists subcategory_id uuid references subcategories(id) on delete set null;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table categories    enable row level security;
alter table subcategories enable row level security;

-- Everyone authenticated can read
create policy "categories_read"    on categories    for select to authenticated using (true);
create policy "subcategories_read" on subcategories for select to authenticated using (true);

-- Everyone authenticated can insert/update/delete
create policy "categories_write"    on categories    for all to authenticated using (true) with check (true);
create policy "subcategories_write" on subcategories for all to authenticated using (true) with check (true);

-- ─── SEED: PARENT CATEGORIES ─────────────────────────────────────────────────

insert into categories (name, icon, colour, sort_order, is_default) values
  ('Electronics',  'pulse-outline',    '#00c8e8', 1, true),
  ('Fasteners',    'ellipse-outline',  '#38bdf8', 2, true),
  ('Tools',        'hammer-outline',   '#32d47a', 3, true),
  ('3D Printing',  'print-outline',    '#a78bfa', 4, true),
  ('Materials',    'layers-outline',   '#f05032', 5, true),
  ('Mechanical',   'settings-outline', '#38bdf8', 6, true),
  ('Safety & PPE', 'shield-outline',   '#888888', 7, true);

-- ─── SEED: SUBCATEGORIES ─────────────────────────────────────────────────────

-- Electronics
insert into subcategories (category_id, name, sort_order)
select id, sub.name, sub.ord from categories, (values
  ('Microcontrollers', 1),
  ('Resistors',        2),
  ('Capacitors',       3),
  ('Switches',         4),
  ('LEDs',             5),
  ('Displays',         6),
  ('Sensors',          7),
  ('Power supply',     8),
  ('Connectors',       9),
  ('Modules',          10)
) as sub(name, ord)
where categories.name = 'Electronics';

-- Fasteners
insert into subcategories (category_id, name, sort_order)
select id, sub.name, sub.ord from categories, (values
  ('Bolts & screws', 1),
  ('Nuts',           2),
  ('Washers',        3),
  ('Standoffs',      4),
  ('Rivets',         5),
  ('Anchors',        6)
) as sub(name, ord)
where categories.name = 'Fasteners';

-- Tools
insert into subcategories (category_id, name, sort_order)
select id, sub.name, sub.ord from categories, (values
  ('Hand tools',      1),
  ('Power tools',     2),
  ('Measuring',       3),
  ('Soldering',       4),
  ('Cutting',         5),
  ('Clamps & vises',  6)
) as sub(name, ord)
where categories.name = 'Tools';

-- 3D Printing
insert into subcategories (category_id, name, sort_order)
select id, sub.name, sub.ord from categories, (values
  ('Filament PLA',  1),
  ('Filament PETG', 2),
  ('Filament ABS',  3),
  ('Resin',         4),
  ('Bed adhesive',  5),
  ('Nozzles',       6),
  ('Print beds',    7)
) as sub(name, ord)
where categories.name = '3D Printing';

-- Materials
insert into subcategories (category_id, name, sort_order)
select id, sub.name, sub.ord from categories, (values
  ('Aluminium stock', 1),
  ('Steel stock',     2),
  ('Timber',          3),
  ('Acrylic',         4),
  ('Foam',            5),
  ('Adhesives',       6),
  ('Consumables',     7)
) as sub(name, ord)
where categories.name = 'Materials';

-- Mechanical
insert into subcategories (category_id, name, sort_order)
select id, sub.name, sub.ord from categories, (values
  ('Bearings',        1),
  ('Belts & pulleys', 2),
  ('Springs',         3),
  ('Gears',           4),
  ('Linear rails',    5),
  ('Motors',          6),
  ('Couplings',       7)
) as sub(name, ord)
where categories.name = 'Mechanical';

-- Safety & PPE
insert into subcategories (category_id, name, sort_order)
select id, sub.name, sub.ord from categories, (values
  ('Eye protection',     1),
  ('Gloves',             2),
  ('Ear protection',     3),
  ('Masks & respirators',4)
) as sub(name, ord)
where categories.name = 'Safety & PPE';
