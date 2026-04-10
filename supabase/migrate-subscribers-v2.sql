-- ============================================================
-- S.P.G.M.S — Subscribers v2 Migration
-- Adds: whatsapp, address, sub_type columns
-- Run in: Supabase Dashboard → SQL Editor (ezwnrrxojplyvvfebasm)
-- ============================================================

ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS whatsapp  TEXT,
  ADD COLUMN IF NOT EXISTS address   TEXT,
  ADD COLUMN IF NOT EXISTS sub_type  TEXT NOT NULL DEFAULT 'residential'
    CHECK (sub_type IN ('residential', 'commercial'));
