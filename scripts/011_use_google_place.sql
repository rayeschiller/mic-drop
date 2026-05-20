-- Replace raw address/city/state columns with Google place data
ALTER TABLE mics ADD COLUMN IF NOT EXISTS place_id text;
ALTER TABLE mics ADD COLUMN IF NOT EXISTS formatted_address text;
ALTER TABLE mics DROP COLUMN IF EXISTS address;
ALTER TABLE mics DROP COLUMN IF EXISTS city;
ALTER TABLE mics DROP COLUMN IF EXISTS state;
