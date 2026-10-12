-- =============================================================
-- Lock down public reads.
--
-- Previously every table had a `select using (true)` policy. Because the
-- anon key is shipped to every browser, anyone could query Supabase's REST
-- API directly and read:
--   * mics.host_pin_hash  (unsalted SHA-256 of a 6-digit PIN — cracked instantly)
--   * mics.host_email
--   * slots.performer_email
--   * waitlist_entries.performer_email
--
-- All app reads now go through server actions using the service role
-- (which bypasses RLS) and return only public columns, so the anon role
-- needs no access at all. RLS stays enabled with no policies = deny all.
-- =============================================================

drop policy if exists "mics_public_read"                on public.mics;
drop policy if exists "slots_public_read"               on public.slots;
drop policy if exists "sections_public_read"            on public.sections;
drop policy if exists "Anyone can read sections"        on public.sections;
drop policy if exists "waitlist_public_read"            on public.waitlist_entries;
drop policy if exists "Anyone can read waitlist entries" on public.waitlist_entries;

alter table public.mics             enable row level security;
alter table public.sections         enable row level security;
alter table public.slots            enable row level security;
alter table public.waitlist_entries enable row level security;

-- Belt and braces: remove direct table privileges from client roles.
revoke all on public.mics, public.sections, public.slots, public.waitlist_entries from anon, authenticated;

-- Verify (should return zero rows for these tables):
-- select tablename, policyname from pg_policies
-- where schemaname = 'public'
--   and tablename in ('mics', 'sections', 'slots', 'waitlist_entries');
