const https = require('https');

const token      = 'sbp_7d9068e03d2aad562d505cbba887a50bfed0ec4d';
const projectRef = 'ezwnrrxojplyvvfebasm';

function runSQL(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${projectRef}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        else resolve(body);
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const queries = [
  // 1. generator_logs — records every start/stop/refuel event
  `CREATE TABLE IF NOT EXISTS generator_logs (
    id         SERIAL PRIMARY KEY,
    gen_id     INTEGER NOT NULL,
    event      TEXT NOT NULL CHECK (event IN ('start','stop','fault','refuel','maintenance')),
    note       TEXT,
    fuel_added INTEGER DEFAULT 0,
    logged_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    logged_by  TEXT DEFAULT 'system'
  )`,
  `CREATE INDEX IF NOT EXISTS idx_gen_logs_gen_id    ON generator_logs(gen_id)`,
  `CREATE INDEX IF NOT EXISTS idx_gen_logs_logged_at ON generator_logs(logged_at)`,

  // 2. generator_subscribers — subscribers per generator (mirrors subscribers but gen_id-keyed)
  `CREATE TABLE IF NOT EXISTS generator_subscribers (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_gen_subs_gen_id ON generator_subscribers(gen_id)`,

  // 3. Add extra columns to generators table
  `ALTER TABLE generators ADD COLUMN IF NOT EXISTS owner_name    TEXT    DEFAULT ''`,
  `ALTER TABLE generators ADD COLUMN IF NOT EXISTS owner_phone   TEXT    DEFAULT ''`,
  `ALTER TABLE generators ADD COLUMN IF NOT EXISTS address       TEXT    DEFAULT ''`,
  `ALTER TABLE generators ADD COLUMN IF NOT EXISTS price_per_amp NUMERIC(10,2) DEFAULT 15000`,
  `ALTER TABLE generators ADD COLUMN IF NOT EXISTS capacity_amps INTEGER DEFAULT 100`,
  `ALTER TABLE generators ADD COLUMN IF NOT EXISTS fuel_quota    INTEGER DEFAULT 500`,
  `ALTER TABLE generators ADD COLUMN IF NOT EXISTS notes         TEXT    DEFAULT ''`,

  // 4. RLS policies
  `ALTER TABLE generator_logs        ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE generator_subscribers ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "allow_all" ON generator_logs`,
  `DROP POLICY IF EXISTS "allow_all" ON generator_subscribers`,
  `CREATE POLICY "allow_all" ON generator_logs        FOR ALL USING (true) WITH CHECK (true)`,
  `CREATE POLICY "allow_all" ON generator_subscribers FOR ALL USING (true) WITH CHECK (true)`,
];

async function main() {
  for (const q of queries) {
    try {
      await runSQL(q);
      console.log('OK:', q.slice(0, 60).replace(/\n/g, ' '));
    } catch (e) {
      console.error('ERR:', e.message.slice(0, 120));
    }
  }
  console.log('\nDone.');
}
main();
