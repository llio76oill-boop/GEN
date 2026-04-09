-- Migration: Add ThingSpeak columns and extended fields to owned_generators
-- Run this in Supabase Dashboard > SQL Editor

ALTER TABLE owned_generators
  ADD COLUMN IF NOT EXISTS thingspeak_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS thingspeak_read_key   TEXT,
  ADD COLUMN IF NOT EXISTS license_number        TEXT,
  ADD COLUMN IF NOT EXISTS monthly_fuel_quota    INTEGER DEFAULT 0;
