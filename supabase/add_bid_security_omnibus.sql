-- Apply in the existing Supabase project's SQL Editor. Existing RLS applies.
begin;
alter table public.bid_docs_editor_state
  add column if not exists bid_security jsonb,
  add column if not exists omnibus jsonb;
commit;
