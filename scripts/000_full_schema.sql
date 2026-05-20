-- =============================================================
-- Mic Drop — complete idempotent schema
-- Run this on a fresh Supabase project to bootstrap the full DB.
-- Safe to re-run; all statements use IF NOT EXISTS / IF EXISTS.
-- =============================================================

-- -------------------------------------------------------
-- Tables
-- -------------------------------------------------------

create table if not exists public.mics (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text unique not null,
  host_pin_hash         text not null,
  name                  text not null,
  venue                 text not null,
  date                  date not null,
  start_time            time not null,
  end_time              time,
  total_slots           integer not null default 10,
  notes                 text,
  host_email            text,
  image_url             text,
  series_slug           text,
  series_name           text,
  signup_opens_at       timestamptz,
  send_reminders        boolean not null default false,
  reminders_sent        boolean not null default false,
  send_two_day_reminder boolean not null default false,
  two_day_reminder_sent boolean not null default false,
  week_reminder_sent    boolean not null default false,
  timezone              text,
  place_id              text,
  formatted_address     text,
  latitude              double precision,
  longitude             double precision,
  created_at            timestamptz not null default now()
);

create table if not exists public.sections (
  id          uuid primary key default gen_random_uuid(),
  mic_id      uuid not null references public.mics(id) on delete cascade,
  name        text,
  start_time  text not null,
  end_time    text,
  total_slots int not null,
  order_index int not null default 0
);

create table if not exists public.slots (
  id                   uuid primary key default gen_random_uuid(),
  mic_id               uuid not null references public.mics(id) on delete cascade,
  section_id           uuid references public.sections(id) on delete set null,
  slot_number          integer not null,
  taken                boolean not null default false,
  performer_name       text,
  performer_instagram  text,
  performer_email      text,
  created_at           timestamptz not null default now(),
  unique (mic_id, slot_number)
);

create table if not exists public.waitlist_entries (
  id                  uuid primary key default gen_random_uuid(),
  mic_id              uuid not null references public.mics(id) on delete cascade,
  performer_name      text not null,
  performer_instagram text,
  performer_email     text not null,
  created_at          timestamptz not null default now()
);

-- -------------------------------------------------------
-- Row-level security
-- -------------------------------------------------------

alter table public.mics             enable row level security;
alter table public.sections         enable row level security;
alter table public.slots            enable row level security;
alter table public.waitlist_entries enable row level security;

-- Public read (all writes go through service role in server actions)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'mics' and policyname = 'mics_public_read'
  ) then
    create policy "mics_public_read" on public.mics for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'sections' and policyname = 'sections_public_read'
  ) then
    create policy "sections_public_read" on public.sections for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'slots' and policyname = 'slots_public_read'
  ) then
    create policy "slots_public_read" on public.slots for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'waitlist_entries' and policyname = 'waitlist_public_read'
  ) then
    create policy "waitlist_public_read" on public.waitlist_entries for select using (true);
  end if;
end $$;

-- -------------------------------------------------------
-- Indexes
-- -------------------------------------------------------

create index if not exists idx_mics_slug       on public.mics (slug);
create index if not exists idx_mics_date       on public.mics (date);
create index if not exists idx_slots_mic_id    on public.slots (mic_id);
create index if not exists idx_sections_mic_id on public.sections (mic_id);

-- -------------------------------------------------------
-- Storage bucket (run manually in Supabase dashboard if
-- the SQL editor doesn't support storage commands):
--
--   Bucket name : mic_image
--   Public      : true  (so image URLs work without auth)
-- -------------------------------------------------------
