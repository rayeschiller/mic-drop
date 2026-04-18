alter table public.mics
  add column if not exists send_two_day_reminder boolean not null default false,
  add column if not exists two_day_reminder_sent boolean not null default false;
