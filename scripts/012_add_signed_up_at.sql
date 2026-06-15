-- Add signed_up_at to slots to track when a performer actually signed up
-- (slots are pre-created with the mic, so created_at is not the signup time)
alter table public.slots
  add column if not exists signed_up_at timestamptz;
