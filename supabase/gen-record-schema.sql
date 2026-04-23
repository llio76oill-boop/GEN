-- ═══════════════════════════════════════════════════════════
--  Generator Record Schema — Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Extra columns on generators table
ALTER TABLE generators ADD COLUMN IF NOT EXISTS owner_name    TEXT    DEFAULT '';
ALTER TABLE generators ADD COLUMN IF NOT EXISTS owner_phone   TEXT    DEFAULT '';
ALTER TABLE generators ADD COLUMN IF NOT EXISTS address       TEXT    DEFAULT '';
ALTER TABLE generators ADD COLUMN IF NOT EXISTS price_per_amp NUMERIC(10,2) DEFAULT 15000;
ALTER TABLE generators ADD COLUMN IF NOT EXISTS capacity_amps INTEGER DEFAULT 100;
ALTER TABLE generators ADD COLUMN IF NOT EXISTS fuel_quota    INTEGER DEFAULT 500;
ALTER TABLE generators ADD COLUMN IF NOT EXISTS notes         TEXT    DEFAULT '';

-- 2. generator_logs — every start / stop / refuel / maintenance event
CREATE TABLE IF NOT EXISTS generator_logs (
  id         SERIAL PRIMARY KEY,
  gen_id     INTEGER NOT NULL,
  event      TEXT NOT NULL CHECK (event IN ('start','stop','fault','refuel','maintenance')),
  note       TEXT,
  fuel_added INTEGER DEFAULT 0,
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  logged_by  TEXT DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_gen_logs_gen_id    ON generator_logs(gen_id);
CREATE INDEX IF NOT EXISTS idx_gen_logs_logged_at ON generator_logs(logged_at);

-- 3. generator_subscribers — subscribers per generator
CREATE TABLE IF NOT EXISTS generator_subscribers (
  id          SERIAL PRIMARY KEY,
  gen_id      INTEGER NOT NULL,
  full_name   TEXT NOT NULL,
  phone       TEXT,
  amps        INTEGER NOT NULL DEFAULT 5,
  sub_type    TEXT NOT NULL DEFAULT 'residential' CHECK (sub_type IN ('residential','commercial')),
  monthly_fee NUMERIC(10,2) DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gen_subs_gen_id ON generator_subscribers(gen_id);

-- 4. generator_operators — operators per generator (standalone, not via owned_generators)
CREATE TABLE IF NOT EXISTS generator_operators (
  id          SERIAL PRIMARY KEY,
  gen_id      INTEGER NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  shift       TEXT NOT NULL CHECK (shift IN ('صباحي','مسائي','ليلي')),
  shift_start TEXT NOT NULL DEFAULT '08:00',
  shift_end   TEXT NOT NULL DEFAULT '16:00',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gen_ops_gen_id ON generator_operators(gen_id);

-- 5. RLS
ALTER TABLE generator_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE generator_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE generator_operators   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON generator_logs;
DROP POLICY IF EXISTS "allow_all" ON generator_subscribers;
DROP POLICY IF EXISTS "allow_all" ON generator_operators;

CREATE POLICY "allow_all" ON generator_logs        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON generator_subscribers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON generator_operators   FOR ALL USING (true) WITH CHECK (true);
