-- Row Level Security policies — users can only access their own data

-- Enable the pg_trgm extension for fuzzy text search
create extension if not exists pg_trgm;

-- Parts
alter table parts enable row level security;
create policy "Users can manage own parts"
  on parts for all using (auth.uid() = user_id);

-- Storage locations
alter table storage_locations enable row level security;
create policy "Users can manage own storage locations"
  on storage_locations for all using (auth.uid() = user_id);

-- Part locations (join through parts ownership)
alter table part_locations enable row level security;
create policy "Users can manage own part locations"
  on part_locations for all using (
    exists (select 1 from parts where parts.id = part_locations.part_id and parts.user_id = auth.uid())
  );

-- Suppliers (read-only for all authenticated users)
alter table suppliers enable row level security;
create policy "Authenticated users can read suppliers"
  on suppliers for select using (auth.role() = 'authenticated');

-- Part supplier links (join through parts ownership)
alter table part_supplier_links enable row level security;
create policy "Users can manage own part supplier links"
  on part_supplier_links for all using (
    exists (select 1 from parts where parts.id = part_supplier_links.part_id and parts.user_id = auth.uid())
  );

-- Projects
alter table projects enable row level security;
create policy "Users can manage own projects"
  on projects for all using (auth.uid() = user_id);

-- Project parts (join through projects ownership)
alter table project_parts enable row level security;
create policy "Users can manage own project parts"
  on project_parts for all using (
    exists (select 1 from projects where projects.id = project_parts.project_id and projects.user_id = auth.uid())
  );

-- Wishlist
alter table wishlist enable row level security;
create policy "Users can manage own wishlist"
  on wishlist for all using (auth.uid() = user_id);

-- Search history
alter table search_history enable row level security;
create policy "Users can manage own search history"
  on search_history for all using (auth.uid() = user_id);
