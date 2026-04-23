-- ============================================================
-- Add lat/lng to owned_generators + update Ramadi coordinates
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

ALTER TABLE owned_generators ADD COLUMN IF NOT EXISTS lat  DOUBLE PRECISION;
ALTER TABLE owned_generators ADD COLUMN IF NOT EXISTS lng  DOUBLE PRECISION;
ALTER TABLE owned_generators ADD COLUMN IF NOT EXISTS address TEXT;

-- Update existing generators with real Ramadi coordinates
UPDATE owned_generators SET lat=33.4177, lng=43.2678, area='حي التأميم'  WHERE id=1;
UPDATE owned_generators SET lat=33.4220, lng=43.3052, area='حي الملعب'  WHERE id=3;
UPDATE owned_generators SET lat=33.4355, lng=43.2948, area='حي البكر'   WHERE id=4;
