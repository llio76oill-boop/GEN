-- ============================================================
-- S.P.G.M.S — ThingSpeak Fields Map Migration v2
-- Adds: thingspeak_fields_map JSONB column to owned_generators
--       UNIQUE constraint on thingspeak_channel_id
-- Run in: Supabase Dashboard → SQL Editor (ezwnrrxojplyvvfebasm)
-- ============================================================

-- Step 1: Add column if missing
ALTER TABLE owned_generators
  ADD COLUMN IF NOT EXISTS thingspeak_fields_map JSONB;

-- Step 2: Remove duplicate channel rows — keep the row with the LOWEST id
-- (the original real generator), delete all later duplicates
DELETE FROM owned_generators
WHERE id NOT IN (
  SELECT MIN(id)
  FROM owned_generators
  WHERE thingspeak_channel_id IS NOT NULL
  GROUP BY thingspeak_channel_id
)
AND thingspeak_channel_id IS NOT NULL;

-- Step 3: Add UNIQUE constraint (now safe — no more duplicates)
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

-- Step 4: Seed field mapping for the known real generator
UPDATE owned_generators
SET    thingspeak_fields_map = '{"field1":"voltage","field2":"current","field3":"power"}'
WHERE  thingspeak_channel_id = '3334757'
  AND  is_mock = FALSE;
