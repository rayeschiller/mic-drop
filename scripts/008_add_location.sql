alter table public.mics
  add column if not exists lat double precision,
  add column if not exists lng double precision;
