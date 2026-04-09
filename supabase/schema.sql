-- ============================================
-- S.P.G.M.S — Supabase Schema
-- ============================================

-- 1) Generators (300 rows)
CREATE TABLE IF NOT EXISTS generators (
  id          SERIAL PRIMARY KEY,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('online-grid','online-gen','fault','offline')),
  power       DOUBLE PRECISION NOT NULL,
  area        TEXT NOT NULL,
  hours       INTEGER NOT NULL DEFAULT 0,
  is_mock     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Owners
CREATE TABLE IF NOT EXISTS owners (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  initials    TEXT NOT NULL,
  owned_since TEXT NOT NULL,
  is_mock     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Owned generators (linked to owners)
CREATE TABLE IF NOT EXISTS owned_generators (
  id                    SERIAL PRIMARY KEY,
  owner_id              INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  code                  TEXT NOT NULL,
  area                  TEXT NOT NULL,
  power                 DOUBLE PRECISION NOT NULL,
  status                TEXT NOT NULL CHECK (status IN ('online-grid','online-gen','fault','offline')),
  total_hours           INTEGER NOT NULL DEFAULT 0,
  license_number        TEXT,
  address               TEXT,
  monthly_fuel_quota    INTEGER DEFAULT 0,
  thingspeak_channel_id TEXT,
  thingspeak_read_key   TEXT,
  is_mock               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Operators (linked to owned_generators)
CREATE TABLE IF NOT EXISTS operators (
  id              SERIAL PRIMARY KEY,
  owned_gen_id    INTEGER NOT NULL REFERENCES owned_generators(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  shift           TEXT NOT NULL CHECK (shift IN ('صباحي','مسائي','ليلي')),
  shift_start     TEXT NOT NULL,
  shift_end       TEXT NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT FALSE,
  is_mock         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) Faults
CREATE TABLE IF NOT EXISTS faults (
  id          SERIAL PRIMARY KEY,
  g_id        TEXT NOT NULL,
  location    TEXT NOT NULL,
  type        TEXT NOT NULL,
  severity    TEXT NOT NULL CHECK (severity IN ('critical','warning','info')),
  time_label  TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT 'WifiOff',
  is_mock     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  type        TEXT NOT NULL CHECK (type IN ('fault','warning','info','success')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  time_label  TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  is_mock     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7) Areas reference
CREATE TABLE IF NOT EXISTS areas (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  lat   DOUBLE PRECISION NOT NULL,
  lng   DOUBLE PRECISION NOT NULL
);

-- Enable RLS but allow all for now
ALTER TABLE generators ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE owned_generators ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE faults ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

-- Policies: drop first so this script is safe to re-run
DO $$ DECLARE
  tbls TEXT[] := ARRAY['generators','owners','owned_generators','operators','faults','notifications','areas'];
  t    TEXT;
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all reads"       ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow service inserts" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow service deletes" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow service updates" ON %I', t);
  END LOOP;
END $$;

CREATE POLICY "Allow all reads" ON generators       FOR SELECT USING (true);
CREATE POLICY "Allow all reads" ON owners           FOR SELECT USING (true);
CREATE POLICY "Allow all reads" ON owned_generators FOR SELECT USING (true);
CREATE POLICY "Allow all reads" ON operators        FOR SELECT USING (true);
CREATE POLICY "Allow all reads" ON faults           FOR SELECT USING (true);
CREATE POLICY "Allow all reads" ON notifications    FOR SELECT USING (true);
CREATE POLICY "Allow all reads" ON areas            FOR SELECT USING (true);

CREATE POLICY "Allow service inserts" ON generators       FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service inserts" ON owners           FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service inserts" ON owned_generators FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service inserts" ON operators        FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service inserts" ON faults           FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service inserts" ON notifications    FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service inserts" ON areas            FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service deletes" ON generators       FOR DELETE USING (true);
CREATE POLICY "Allow service deletes" ON owners           FOR DELETE USING (true);
CREATE POLICY "Allow service deletes" ON owned_generators FOR DELETE USING (true);
CREATE POLICY "Allow service deletes" ON operators        FOR DELETE USING (true);
CREATE POLICY "Allow service deletes" ON faults           FOR DELETE USING (true);
CREATE POLICY "Allow service deletes" ON notifications    FOR DELETE USING (true);
CREATE POLICY "Allow service deletes" ON areas            FOR DELETE USING (true);

CREATE POLICY "Allow service updates" ON generators       FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow service updates" ON owners           FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow service updates" ON owned_generators FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow service updates" ON operators        FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow service updates" ON faults           FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow service updates" ON notifications    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow service updates" ON areas            FOR UPDATE USING (true) WITH CHECK (true);
