-- ============================================================
-- S.P.G.M.S — ThingSpeak Fields Map Migration
-- Adds: thingspeak_fields_map JSONB column to owned_generators
-- Run in: Supabase Dashboard → SQL Editor (ezwnrrxojplyvvfebasm)
-- ============================================================

ALTER TABLE owned_generators
  ADD COLUMN IF NOT EXISTS thingspeak_fields_map JSONB;

-- Optional: seed the known real generator's field mapping directly
-- so it is available before the first sync is triggered.
UPDATE owned_generators
SET    thingspeak_fields_map = '{"field1":"voltage","field2":"current","field3":"power"}'
WHERE  thingspeak_channel_id = '3334757'
  AND  is_mock = FALSE;
