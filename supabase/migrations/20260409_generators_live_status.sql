-- ============================================================
-- S.P.G.M.S — Migration: generators_live_status
-- Stores high-frequency telemetry pushed by ThingsBoard
-- via the Edge Function webhook.
-- ============================================================

CREATE TABLE IF NOT EXISTS generators_live_status (
  id             SERIAL PRIMARY KEY,
  generator_code TEXT        NOT NULL UNIQUE,  -- matches TB device name / owned_generators.code
  status         TEXT        NOT NULL CHECK (status IN ('online', 'offline', 'fault')),
  current_load   DOUBLE PRECISION NOT NULL DEFAULT 0,  -- kW
  voltage        DOUBLE PRECISION NOT NULL DEFAULT 0,  -- Volts
  last_seen      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by generator code
CREATE INDEX IF NOT EXISTS idx_gls_generator_code ON generators_live_status (generator_code);

-- Index for recent-telemetry queries
CREATE INDEX IF NOT EXISTS idx_gls_last_seen      ON generators_live_status (last_seen DESC);

-- Row Level Security: only service-role key (edge function) can write
ALTER TABLE generators_live_status ENABLE ROW LEVEL SECURITY;

-- Allow authenticated dashboard users to SELECT
CREATE POLICY "allow_read" ON generators_live_status
  FOR SELECT USING (auth.role() = 'authenticated');

-- Service-role bypass (edge function uses service-role key — bypasses RLS automatically)
