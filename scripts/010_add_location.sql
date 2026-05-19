-- Add location fields to mics table for "near me" discovery
ALTER TABLE mics ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE mics ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE mics ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE mics ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE mics ADD COLUMN IF NOT EXISTS longitude double precision;
