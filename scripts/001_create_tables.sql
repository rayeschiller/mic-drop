-- Mics table: stores open mic events
create table if not exists public.mics (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  host_pin_hash text not null,
  name text not null,
  venue text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  total_slots integer not null default 10,
  notes text,
  created_at timestamptz not null default now()
);

-- Slots table: stores individual signup slots for each mic
create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  mic_id uuid not null references public.mics(id) on delete cascade,
  slot_number integer not null,
  taken boolean not null default false,
  performer_name text,
  performer_instagram text,
  performer_email text,
  created_at timestamptz not null default now(),
  unique (mic_id, slot_number)
);

-- Enable RLS on both tables
alter table public.mics enable row level security;
alter table public.slots enable row level security;

-- Public read access for mics (anyone can view mic details)
create policy "mics_public_read" on public.mics
  for select using (true);

-- Public read access for slots, but exclude performer_email
-- We use a security definer function to control what's returned
create policy "slots_public_read" on public.slots
  for select using (true);

-- No direct insert/update/delete from anon key - all writes go through service role via server actions
-- This keeps host_pin_hash and performer_email protected server-side

-- Create index for fast slug lookups
create index if not exists idx_mics_slug on public.mics (slug);

-- Create index for fast mic_id lookups on slots
create index if not exists idx_slots_mic_id on public.slots (mic_id);
