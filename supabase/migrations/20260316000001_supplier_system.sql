-- MakerVault — Supplier System Migration
-- Adds supplier metadata, user preferences, user settings, and seed data.

-- ─── EXTEND SUPPLIERS TABLE ──────────────────────────────────────────────────

alter table suppliers add column if not exists is_mv_preferred boolean default false;
alter table suppliers add column if not exists countries text[] default '{US,GLOBAL}';
alter table suppliers add column if not exists logo_bg text not null default '#1e3a50';
alter table suppliers add column if not exists logo_text text not null default '#a0d8e8';
alter table suppliers add column if not exists logo_label text not null default 'SUPP';
alter table suppliers add column if not exists url_template text;
alter table suppliers add column if not exists affiliate_url_template text;
alter table suppliers add column if not exists affiliate_code text;
alter table suppliers add column if not exists affiliate_network text;
alter table suppliers add column if not exists commission_rate text;
alter table suppliers add column if not exists description text;
alter table suppliers add column if not exists category text default 'general';
alter table suppliers add column if not exists sort_order integer default 0;

-- ─── USER SUPPLIER PREFERENCES ───────────────────────────────────────────────

create table if not exists user_supplier_prefs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  supplier_id     uuid references suppliers(id) on delete cascade,
  is_favourite    boolean default false,
  is_enabled      boolean default true,
  sort_order      integer default 0,
  created_at      timestamptz default now(),
  unique(user_id, supplier_id)
);

alter table user_supplier_prefs enable row level security;
create policy "prefs_own" on user_supplier_prefs for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── USER SETTINGS ───────────────────────────────────────────────────────────

create table if not exists user_settings (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  country_code            text default 'US',
  show_global             boolean default true,
  amazon_affiliate_tag    text,
  jameco_avantlink_id     text,
  home_depot_impact_id    text,
  updated_at              timestamptz default now()
);

alter table user_settings enable row level security;
create policy "settings_own" on user_settings for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── SEED SUPPLIERS ──────────────────────────────────────────────────────────

-- Clear existing seed data if re-running
delete from suppliers where name in (
  'Amazon','DigiKey','Mouser','McMaster-Carr','Adafruit','SparkFun',
  'Arrow','Newark','Jameco','LCSC','AliExpress','Digi-Key',
  'RS Components','Farnell','Home Depot','Micro Center'
);

-- MV Preferred (top tier)
insert into suppliers (name, base_url, is_mv_preferred, countries, logo_bg, logo_text, logo_label, url_template, affiliate_url_template, affiliate_network, commission_rate, description, category, sort_order) values
  ('Amazon', 'https://www.amazon.com', true, '{US,UK,CA,AU,GLOBAL}',
   '#FF9900', '#000000', 'AMZ',
   'https://www.amazon.com/s?k={query}',
   'https://www.amazon.com/s?k={query}&tag={affiliate_code}',
   'Amazon Associates', '3-4%',
   'Fast shipping, wide selection', 'general', 1),

  ('DigiKey', 'https://www.digikey.com', true, '{US,UK,CA,AU,GLOBAL}',
   '#CC0000', '#FFFFFF', 'DIGI',
   'https://www.digikey.com/en/products/result?keywords={query}',
   null, null, null,
   'Professional electronics distributor', 'electronics', 2),

  ('Mouser', 'https://www.mouser.com', true, '{US,UK,CA,AU,GLOBAL}',
   '#004B87', '#FFFFFF', 'MOUS',
   'https://www.mouser.com/c/?q={query}',
   null, null, null,
   'Global electronics distributor', 'electronics', 3),

  ('McMaster-Carr', 'https://www.mcmaster.com', true, '{US,CA}',
   '#000000', '#FFFFFF', 'McMC',
   'https://www.mcmaster.com/search/{query}',
   null, null, null,
   'Hardware, tools, raw materials', 'hardware', 4);

-- Electronics specialists
insert into suppliers (name, base_url, is_mv_preferred, countries, logo_bg, logo_text, logo_label, url_template, affiliate_url_template, affiliate_network, commission_rate, description, category, sort_order) values
  ('Adafruit', 'https://www.adafruit.com', false, '{US,GLOBAL}',
   '#000000', '#FFFFFF', 'ADA',
   'https://www.adafruit.com/search?q={query}',
   null, 'ShareASale', '5%',
   'Maker-focused boards & kits', 'electronics', 10),

  ('SparkFun', 'https://www.sparkfun.com', false, '{US,GLOBAL}',
   '#E42C2C', '#FFFFFF', 'SPRK',
   'https://www.sparkfun.com/search#t=products&q={query}',
   null, null, null,
   'Breakout boards, sensors, kits', 'electronics', 11),

  ('Arrow', 'https://www.arrow.com', false, '{US,UK,GLOBAL}',
   '#F36E21', '#FFFFFF', 'ARRW',
   'https://www.arrow.com/en/products/search?q={query}',
   null, null, null,
   'Enterprise electronics distributor', 'electronics', 12),

  ('Newark', 'https://www.newark.com', false, '{US,UK,CA}',
   '#E31837', '#FFFFFF', 'NWRK',
   'https://www.newark.com/search?st={query}',
   null, null, null,
   'Farnell / element14 US brand', 'electronics', 13),

  ('Jameco', 'https://www.jameco.com', false, '{US}',
   '#003366', '#FFFFFF', 'JAMC',
   'https://www.jameco.com/z/search.htm?search_info={query}',
   'https://www.jameco.com/z/search.htm?search_info={query}&avad={affiliate_code}',
   'AvantLink', '5%',
   'Components & hobby electronics', 'electronics', 14),

  ('LCSC', 'https://www.lcsc.com', false, '{US,GLOBAL}',
   '#0066CC', '#FFFFFF', 'LCSC',
   'https://www.lcsc.com/search?q={query}',
   null, null, null,
   'Low-cost Chinese components', 'electronics', 15);

-- General / hardware
insert into suppliers (name, base_url, is_mv_preferred, countries, logo_bg, logo_text, logo_label, url_template, description, category, sort_order) values
  ('AliExpress', 'https://www.aliexpress.com', false, '{GLOBAL}',
   '#E43225', '#FFFFFF', 'ALI',
   'https://www.aliexpress.com/wholesale?SearchText={query}',
   'Budget components, bulk orders', 'general', 20),

  ('Home Depot', 'https://www.homedepot.com', false, '{US}',
   '#F96302', '#FFFFFF', 'HD',
   'https://www.homedepot.com/s/{query}',
   'Hardware, tools, raw materials', 'hardware', 21),

  ('Micro Center', 'https://www.microcenter.com', false, '{US}',
   '#CF202F', '#FFFFFF', 'MCTR',
   'https://www.microcenter.com/search/search_results.aspx?Ntt={query}',
   'Electronics retail, dev boards', 'electronics', 22);

-- UK / international
insert into suppliers (name, base_url, is_mv_preferred, countries, logo_bg, logo_text, logo_label, url_template, description, category, sort_order) values
  ('RS Components', 'https://www.rs-online.com', false, '{UK,AU,GLOBAL}',
   '#D42020', '#FFFFFF', 'RS',
   'https://www.rs-online.com/web/c/?searchTerm={query}',
   'Industrial & electronics (UK/AU)', 'electronics', 30),

  ('Farnell', 'https://www.farnell.com', false, '{UK,GLOBAL}',
   '#1D3557', '#FFFFFF', 'FRNL',
   'https://www.farnell.com/search?st={query}',
   'element14 UK brand', 'electronics', 31);
