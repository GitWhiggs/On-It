-- On-It: lock down public.jobs. Run AFTER the profiles migration is tested.
--
-- This is the "safe now" version: it fixes who can READ and WRITE jobs while keeping
-- the current client flow working (client still sends amount/price/service_fee on
-- insert and still completes/cancels its own job).
-- Known limitation, to be fixed before real money moves: prices are still
-- client-supplied. Move job creation into a server function that verifies the
-- Stripe payment and computes amount/price/service_fee, then remove those columns
-- from the insert grant below.
--
-- BEFORE RUNNING, look at your existing rows. Rows whose user_id is null or is not a
-- real Firebase UID become invisible to every user after this (they are not deleted):
--   select user_id, count(*) from public.jobs group by 1;
--
-- Behavior change to expect: the dev-only "tap the card to advance stage" in
-- Jobs.tsx will stop saving, because clients may no longer write `stage`.
-- Use the SQL editor (or later a server function) to move stages while testing.

begin;

do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'jobs'
  loop
    execute format('drop policy if exists %I on public.jobs', p.policyname);
  end loop;
end $$;

alter table public.jobs enable row level security;
revoke all on table public.jobs from public, anon, authenticated;

create policy jobs_select_own on public.jobs
  for select to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy jobs_insert_own on public.jobs
  for insert to authenticated
  with check (
    user_id = (select auth.jwt() ->> 'sub')
    and status = 'active'
  );

create policy jobs_update_own on public.jobs
  for update to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'))
  with check (user_id = (select auth.jwt() ->> 'sub'));

-- Column grants. `stage` is intentionally absent from insert (uses the column default)
-- and from update. user_id, amount, price, service_fee cannot be changed after insert.
grant select on table public.jobs to authenticated;
grant insert (user_id, category, address, when_text, details,
              amount, price, service_fee, status)
  on public.jobs to authenticated;
grant update (status) on public.jobs to authenticated;

-- Clients may only move their own job from 'active' to 'cancelled' or 'completed'.
-- Roles other than anon/authenticated (SQL editor, service_role, server functions)
-- are not restricted.
create or replace function public.jobs_guard_client_update()
returns trigger language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.status is distinct from old.status
     and not (old.status = 'active' and new.status in ('cancelled', 'completed')) then
    raise exception 'Invalid status change: % -> %', old.status, new.status;
  end if;
  return new;
end $$;

drop trigger if exists jobs_guard_client_update on public.jobs;
create trigger jobs_guard_client_update
  before update on public.jobs
  for each row execute function public.jobs_guard_client_update();

commit;
