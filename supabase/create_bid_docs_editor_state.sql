-- Run in the SQL editor of the SAME Supabase project as src/supabase.js.
-- The publishable API cannot expose pg_catalog. Inspect and use the actual type,
-- rather than guessing from IDs that happen to contain digits.
begin;
do $$
declare project_id_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into strict project_id_type
  from pg_attribute a
  where a.attrelid = 'public.philgeps_posts'::regclass
    and a.attname = 'id' and not a.attisdropped;
  raise notice 'philgeps_posts.id type: %', project_id_type;
  execute format('create table public.bid_docs_editor_state (
    id uuid primary key default gen_random_uuid(),
    project_id %s not null unique references public.philgeps_posts(id),
    technical_specs jsonb check (technical_specs is null or jsonb_typeof(technical_specs) = ''array''),
    schedule_requirements jsonb check (schedule_requirements is null or jsonb_typeof(schedule_requirements) = ''array''),
    editor_status text not null default ''editing'',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )', project_id_type);
end $$;

alter table public.bid_docs_editor_state enable row level security;
-- Existing Flutter SQL grants anon/authenticated read/insert/update. This table
-- narrows that access to projects the caller can see and marked for bidding.
create policy editor_state_read on public.bid_docs_editor_state
for select to anon, authenticated using (
  exists (select 1 from public.philgeps_posts p where p.id = project_id and p.is_bidding_doc = true)
);
create policy editor_state_insert on public.bid_docs_editor_state
for insert to anon, authenticated with check (
  exists (select 1 from public.philgeps_posts p where p.id = project_id and p.is_bidding_doc = true)
);
create policy editor_state_update on public.bid_docs_editor_state
for update to anon, authenticated using (
  exists (select 1 from public.philgeps_posts p where p.id = project_id and p.is_bidding_doc = true)
) with check (
  exists (select 1 from public.philgeps_posts p where p.id = project_id and p.is_bidding_doc = true)
);
grant select, insert, update on public.bid_docs_editor_state to anon, authenticated;
-- No delete grant/policy. No service-role key or changes to existing tables.
commit;

select format_type(atttypid, atttypmod) as project_id_type
from pg_attribute where attrelid = 'public.bid_docs_editor_state'::regclass and attname = 'project_id';
