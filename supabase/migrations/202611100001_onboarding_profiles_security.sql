-- On-It: lock down public.profiles (run this one FIRST; it does not touch jobs).
--
-- BEFORE RUNNING: confirm the table shape with the schema query and check that
-- user_id has no duplicates:
--   select user_id, count(*) from public.profiles group by 1 having count(*) > 1;
--
-- Auth model: Firebase phone auth + Supabase third-party auth. Firebase UIDs are
-- text, NOT uuids, so policies compare against the JWT "sub" claim. Do not use
-- auth.uid() here: it casts to uuid and will error or never match.

begin;

-- 1. Columns the new onboarding flow needs (no-ops if they already exist).
alter table public.profiles add column if not exists helper_onboarded_at timestamptz;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- One profile per Firebase user.
create unique index if not exists profiles_user_id_key on public.profiles (user_id);

-- updated_at is maintained by the database so clients cannot forge it.
create or replace function public.profiles_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.profiles_set_updated_at();

-- 2. Basic input limits (NOT VALID = applies to new/changed rows, doesn't fail on old data).
alter table public.profiles drop constraint if exists profiles_input_limits;
alter table public.profiles add constraint profiles_input_limits check (
  char_length(first_name) <= 50
  and char_length(helper_city) <= 80
  and coalesce(cardinality(helper_categories), 0) <= 20
) not valid;

-- 3. Remove the temporary, globally permissive policies.
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', p.policyname);
  end loop;
end $$;

alter table public.profiles enable row level security;

-- 4. Reset privileges. A table-level REVOKE also clears any column-level grants.
revoke all on table public.profiles from public, anon, authenticated;

-- 5. Owner-only policies.
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (user_id = (select auth.jwt() ->> 'sub'));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'))
  with check (user_id = (select auth.jwt() ->> 'sub'));

-- 6. Column grants. user_id, created_at and updated_at are never client-writable on
--    update, and created_at/updated_at are never client-supplied on insert.
--    No DELETE grant: clients cannot delete profiles.
grant select on table public.profiles to authenticated;
grant insert (user_id, first_name, mode, helper_onboarded_at, helper_categories,
              helper_vehicle, helper_city, helper_radius_miles,
              helper_availability, helper_alerts)
  on public.profiles to authenticated;
grant update (first_name, mode, helper_onboarded_at, helper_categories,
              helper_vehicle, helper_city, helper_radius_miles,
              helper_availability, helper_alerts)
  on public.profiles to authenticated;

commit;

-- NOTE: `mode` and the helper_* columns are user-editable preferences. Never use
-- them to authorize access to customer data. Helper approval must live in a
-- server-controlled column (e.g. helper_status) that is not in the grants above.
