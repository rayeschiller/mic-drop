-- Add an IANA timezone string (e.g. 'America/Los_Angeles', 'Europe/London').
-- Used by reminder crons to convert the mic's local date + start_time
-- into an accurate UTC timestamp for "is this mic due?" comparisons.
--
-- Existing rows are intentionally left with timezone = NULL rather than
-- backfilled to a guessed zone. New rows from the create form set this
-- automatically from the host's browser. Edits re-save it. Until an
-- existing mic is edited, lib/time.ts falls back to America/Los_Angeles
-- so its reminders don't silently break.
alter table public.mics
  add column if not exists timezone text;
