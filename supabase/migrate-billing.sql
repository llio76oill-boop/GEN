-- ============================================================
-- S.P.G.M.S — Billing Engine Migration
-- Run in: Supabase Dashboard → SQL Editor (ezwnrrxojplyvvfebasm)
-- ============================================================

-- 1. Regions Pricing ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regions_pricing (
  id            SERIAL PRIMARY KEY,
  region_id     TEXT NOT NULL UNIQUE,          -- 'A1', 'B3', etc.
  region_name   TEXT NOT NULL,                 -- Arabic area name
  price_per_amp INTEGER NOT NULL DEFAULT 10000, -- IQD per amp per month
  commission    INTEGER NOT NULL DEFAULT 500,   -- IQD fixed service fee
  owned_gen_id  INTEGER REFERENCES owned_generators(id) ON DELETE SET NULL,
  updated_by    TEXT DEFAULT 'admin',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Subscribers ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscribers (
  id            SERIAL PRIMARY KEY,
  sub_code      TEXT NOT NULL UNIQUE,          -- 'SUB-A1-001'
  full_name     TEXT NOT NULL,                 -- stored plain, displayed obfuscated
  region_id     TEXT NOT NULL,
  owned_gen_id  INTEGER REFERENCES owned_generators(id) ON DELETE SET NULL,
  amps          DOUBLE PRECISION NOT NULL DEFAULT 5,
  phone         TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (region_id) REFERENCES regions_pricing(region_id)
);

-- 3. Bills ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
  id            SERIAL PRIMARY KEY,
  subscriber_id INTEGER NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  month_label   TEXT NOT NULL,                 -- '2026-04'
  amps          DOUBLE PRECISION NOT NULL,
  price_per_amp INTEGER NOT NULL,
  commission    INTEGER NOT NULL DEFAULT 500,
  total_iqd     INTEGER NOT NULL,              -- (amps * price_per_amp) + commission
  status        TEXT NOT NULL CHECK (status IN ('pending','paid','overdue')) DEFAULT 'pending',
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subscriber_id, month_label)
);

-- 4. Payments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id              SERIAL PRIMARY KEY,
  bill_id         INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  method          TEXT NOT NULL CHECK (method IN ('zaincash','superkey','card','cash')),
  amount_iqd      INTEGER NOT NULL,
  receipt_number  TEXT,
  description     TEXT,
  transaction_ref TEXT,
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by     TEXT DEFAULT 'system'
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE regions_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments         ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE
  tbls TEXT[] := ARRAY['regions_pricing','subscribers','bills','payments'];
  t    TEXT;
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all reads"       ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow service inserts" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow service updates" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow service deletes" ON %I', t);
  END LOOP;
END $$;

CREATE POLICY "Allow all reads"       ON regions_pricing FOR SELECT USING (true);
CREATE POLICY "Allow service inserts" ON regions_pricing FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service updates" ON regions_pricing FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow service deletes" ON regions_pricing FOR DELETE USING (true);

CREATE POLICY "Allow all reads"       ON subscribers FOR SELECT USING (true);
CREATE POLICY "Allow service inserts" ON subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service updates" ON subscribers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow service deletes" ON subscribers FOR DELETE USING (true);

CREATE POLICY "Allow all reads"       ON bills FOR SELECT USING (true);
CREATE POLICY "Allow service inserts" ON bills FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service updates" ON bills FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow service deletes" ON bills FOR DELETE USING (true);

CREATE POLICY "Allow all reads"       ON payments FOR SELECT USING (true);
CREATE POLICY "Allow service inserts" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service updates" ON payments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow service deletes" ON payments FOR DELETE USING (true);

-- ── Seed: Regions ────────────────────────────────────────────
INSERT INTO regions_pricing (region_id, region_name, price_per_amp, commission) VALUES
  ('A1', 'الرمادي — حي التأميم',   10000, 500),
  ('A2', 'الرمادي — حي العسكري',   11000, 500),
  ('A3', 'الرمادي — حي الضباط',    12000, 500),
  ('B1', 'الفلوجة — الجولان',       9500,  500),
  ('B2', 'الفلوجة — حي العدل',      10500, 500),
  ('C1', 'القائم — المركز',          8000,  500),
  ('C2', 'عانة — مركز المدينة',     8500,  500)
ON CONFLICT (region_id) DO NOTHING;

-- ── Seed: Subscribers (demo) ─────────────────────────────────
INSERT INTO subscribers (sub_code, full_name, region_id, amps, phone) VALUES
  ('SUB-A1-001', 'أحمد محمد الدليمي',  'A1', 5,  '07901234101'),
  ('SUB-A1-002', 'فاطمة علي الجبوري',  'A1', 3,  '07901234102'),
  ('SUB-A2-001', 'محمد حسين العبيدي',  'A2', 8,  '07901234103'),
  ('SUB-B1-001', 'عمر خالد الدليمي',   'B1', 5,  '07901234104'),
  ('SUB-B1-002', 'سارة أحمد العزاوي',  'B1', 4,  '07901234105'),
  ('SUB-C1-001', 'علي ياسر الكربلائي', 'C1', 6,  '07901234106')
ON CONFLICT (sub_code) DO NOTHING;

-- ── Seed: Bills (current month) ──────────────────────────────
INSERT INTO bills (subscriber_id, month_label, amps, price_per_amp, commission, total_iqd, status)
SELECT
  s.id,
  to_char(now(), 'YYYY-MM'),
  s.amps,
  r.price_per_amp,
  r.commission,
  CAST((s.amps * r.price_per_amp) + r.commission AS INTEGER),
  'pending'
FROM subscribers s
JOIN regions_pricing r ON s.region_id = r.region_id
ON CONFLICT (subscriber_id, month_label) DO NOTHING;

-- Mark one bill as paid for demo
UPDATE bills
SET status = 'paid', paid_at = now() - INTERVAL '2 days'
WHERE subscriber_id = (SELECT id FROM subscribers WHERE sub_code = 'SUB-A1-002')
  AND status = 'pending';
