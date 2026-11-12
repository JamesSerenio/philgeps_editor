-- Allow the public Bid Docs Editor to create a blank manual BDocs entry.
-- This is intentionally narrow: the inserted row must be marked as a bidding
-- document and all source/PhilGEPS project fields must be blank. The actual
-- user-entered project information continues to be saved in
-- bid_docs_editor_state.

drop policy if exists "manual_bidding_document_insert" on public.philgeps_posts;

create policy "manual_bidding_document_insert"
on public.philgeps_posts
for insert
to anon, authenticated
with check (
  is_bidding_doc = true
  and coalesce(title, '') = ''
  and coalesce(reference_number, '') = ''
  and coalesce(procuring_entity, '') = ''
  and coalesce(lgu, '') = ''
);

grant insert on public.philgeps_posts to anon, authenticated;
