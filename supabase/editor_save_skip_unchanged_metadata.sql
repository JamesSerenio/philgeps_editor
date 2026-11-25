-- Apply in the Supabase SQL editor. Replaces only the existing sync function.
-- Skips unchanged project updates; no backfill, schema, grants, or data changes.
begin;
create or replace function public.sync_editor_project_metadata()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  p public.philgeps_posts%rowtype;
  setup jsonb := new.bid_security->'documentSetup';
  prior jsonb := case when tg_op='UPDATE' then old.bid_security->'documentSetup' else '{}'::jsonb end;
  flags jsonb; k text; v text; prior_value text; changed boolean;
begin
  if setup is null or jsonb_typeof(setup)<>'object' then return new; end if;
  select * into p from public.philgeps_posts where id=new.project_id and is_bidding_doc=true for update;
  if not found then raise exception 'Project is missing or is not a BDocs project'; end if;
  flags := coalesce(p.project_metadata_overrides,'{}'::jsonb);
  foreach k in array array['projectTitle','referenceNumber','procuringEntity','municipality','province'] loop
    if not (setup ? k) then continue; end if;
    v := trim(coalesce(setup->>k,''));
    changed := (prior->>k) is distinct from (setup->>k);
    -- A new/changed setup is an explicit edit. Blank hydration defaults must not
    -- erase an imported project's existing identity.
    if v<>'' or (p.is_manual and changed) then
      prior_value:=case k when 'projectTitle' then p.title when 'referenceNumber' then p.reference_number when 'procuringEntity' then p.procuring_entity when 'municipality' then p.lgu else p.area_of_delivery end;
      if changed or prior_value is distinct from v then
        flags := flags || jsonb_build_object(case k when 'projectTitle' then 'title' when 'referenceNumber' then 'reference_number' when 'procuringEntity' then 'procuring_entity' when 'municipality' then 'lgu' else 'area_of_delivery' end,true);
      end if;
      case k
        when 'projectTitle' then p.title:=v;
        when 'referenceNumber' then p.reference_number:=v;
        when 'procuringEntity' then p.procuring_entity:=v;
        when 'municipality' then p.lgu:=v;
        when 'province' then p.area_of_delivery:=v;
      end case;
    end if;
  end loop;
  if p.is_manual=true and setup ? 'closingDate' then
    v:=nullif(trim(setup->>'closingDate'),'');
    if v is not null and v !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Manual deadline must be YYYY-MM-DD'; end if;
    p.manual_deadline:=v::date;
  end if;
  update public.philgeps_posts set title=p.title,reference_number=p.reference_number,
    procuring_entity=p.procuring_entity,lgu=p.lgu,area_of_delivery=p.area_of_delivery,
    manual_deadline=p.manual_deadline,project_metadata_overrides=flags where id=p.id
    and row(title,reference_number,procuring_entity,lgu,area_of_delivery,manual_deadline,project_metadata_overrides)
      is distinct from row(p.title,p.reference_number,p.procuring_entity,p.lgu,p.area_of_delivery,p.manual_deadline,flags);
  return new;
end $$;
revoke all on function public.sync_editor_project_metadata() from public,anon,authenticated;
commit;

