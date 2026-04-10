-- Waitlist entries: performers waiting for an open slot
create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  mic_id uuid not null references public.mics(id) on delete cascade,
  performer_name text not null,
  performer_instagram text,
  performer_email text not null,
  created_at timestamptz not null default now()
);

alter table public.waitlist_entries enable row level security;

-- Public can read (we only expose count, never emails, via server actions)
create policy "Anyone can read waitlist entries"
  on public.waitlist_entries for select using (true);
