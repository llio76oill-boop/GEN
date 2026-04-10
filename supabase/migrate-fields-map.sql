-- ============================================================
-- S.P.G.M.S — ThingSpeak Fields Map Migration
-- Adds: thingspeak_fields_map JSONB column to owned_generators
--       UNIQUE constraint on thingspeak_channel_id (required for
--       Edge Function upsert with onConflict: 'thingspeak_channel_id')
-- Run in: Supabase Dashboard → SQL Editor (ezwnrrxojplyvvfebasm)
-- ============================================================

ALTER TABLE owned_generators
  ADD COLUMN IF NOT EXISTS thingspeak_fields_map JSONB;

-- Add UNIQUE constraint so the Edge Function can use
-- .upsert({ onConflict: 'thingspeak_channel_id' }).
-- NULLs are never considered duplicates in PostgreSQL UNIQUE constraints,
-- so existing mock rows with NULL channel_id are unaffected.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_owned_generators_channel_id'
  ) THEN
    ALTER TABLE owned_generators
      ADD CONSTRAINT uq_owned_generators_channel_id
      UNIQUE (thingspeak_channel_id);
  END IF;
END
$$;

-- Optional: seed the known real generator's field mapping directly
-- so it is available before the first sync is triggered.
UPDATE owned_generators
SET    thingspeak_fields_map = '{"field1":"voltage","field2":"current","field3":"power"}'
WHERE  thingspeak_channel_id = '3334757'
  AND  is_mock = FALSE;
