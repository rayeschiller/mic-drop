-- Track whether the week-before performer reminder has been sent for each mic
alter table public.mics
  add column if not exists week_reminder_sent boolean not null default false;
