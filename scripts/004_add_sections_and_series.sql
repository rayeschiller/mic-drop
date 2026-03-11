-- Sections: each mic can have multiple time blocks
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  mic_id uuid not null references public.mics(id) on delete cascade,
  name text,
  start_time text not null,
  end_time text,
  total_slots int not null,
  order_index int not null default 0
);

alter table public.sections enable row level security;

create policy "Anyone can read sections"
  on public.sections for select using (true);

-- Add section_id to slots (nullable for backward compat with legacy mics)
alter table public.slots
  add column if not exists section_id uuid references public.sections(id) on delete set null;

-- Add series columns to mics (for recurring events)
alter table public.mics
  add column if not exists series_slug text;

alter table public.mics
  add column if not exists series_name text;
