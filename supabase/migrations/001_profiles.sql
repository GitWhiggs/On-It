-- On-It: profiles. One row per user, keyed by the same id the app saves in jobs.user_id.
--
-- TEMPORARY ACCESS RULES
-- The app talks to Supabase with its public key and no signed-in Supabase user, so the
-- rules at the bottom let anyone holding that key read and change any row (the same way
-- the jobs table is used today). Replace them with "each person can only touch their own
-- row" once login is connected to Supabase. The app is not allowed to delete rows.

create table if not exists public.profiles (
  user_id              text primary key,
  first_name           text,
  mode                 text not null default 'customer'
                         check (mode in ('customer', 'helper')),
  helper_onboarded_at  timestamptz,
  helper_categories    text[] not null default '{}',
  helper_vehicle       text check (helper_vehicle in ('none', 'car', 'truck')),
  helper_city          text,
  helper_radius_miles  integer not null default 15
                         check (helper_radius_miles between 5 and 30),
  helper_availability  text not null default 'online'
                         check (helper_availability in ('online', 'schedule')),
  helper_alerts        boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "temp_profiles_read"   on public.profiles;
drop policy if exists "temp_profiles_insert" on public.profiles;
drop policy if exists "temp_profiles_update" on public.profiles;

create policy "temp_profiles_read"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "temp_profiles_insert"
  on public.profiles for insert
  to anon, authenticated
  with check (true);

create policy "temp_profiles_update"
  on public.profiles for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on public.profiles to anon, authenticated;
