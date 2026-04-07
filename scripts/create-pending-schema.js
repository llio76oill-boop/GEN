const https = require('https');
const token = 'sbp_7d9068e03d2aad562d505cbba887a50bfed0ec4d';
const projectRef = 'gvromjxytcybvaxuktnt';

function runSQL(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${projectRef}/database/query`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => res.statusCode >= 400 ? reject(new Error(`HTTP ${res.statusCode}: ${body}`)) : resolve(body));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS generators_pending (
      id            SERIAL PRIMARY KEY,
      owner_name    TEXT NOT NULL,
      owner_phone   TEXT NOT NULL,
      license_no    TEXT NOT NULL,
      lat           DOUBLE PRECISION NOT NULL,
      lng           DOUBLE PRECISION NOT NULL,
      fuel_quota    INTEGER NOT NULL DEFAULT 0,
      price_per_hour NUMERIC NOT NULL DEFAULT 38,
      status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      is_mock       BOOLEAN NOT NULL DEFAULT FALSE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,
    `CREATE TABLE IF NOT EXISTS pending_operators (
      id              SERIAL PRIMARY KEY,
      pending_gen_id  INTEGER NOT NULL REFERENCES generators_pending(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      phone           TEXT NOT NULL,
      shift_start     TEXT NOT NULL,
      shift_end       TEXT NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,
    `CREATE TABLE IF NOT EXISTS maintenance_logs (
      id              SERIAL PRIMARY KEY,
      generator_code  TEXT NOT NULL,
      owner_id        INTEGER,
      log_type        TEXT NOT NULL,
      description     TEXT NOT NULL,
      logged_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      is_mock         BOOLEAN NOT NULL DEFAULT FALSE
    );`,
    `CREATE TABLE IF NOT EXISTS official_decrees (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      body        TEXT,
      pdf_url     TEXT,
      published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      is_mock     BOOLEAN NOT NULL DEFAULT FALSE
    );`,
    `ALTER TABLE generators_pending ENABLE ROW LEVEL SECURITY;
     ALTER TABLE pending_operators ENABLE ROW LEVEL SECURITY;
     ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
     ALTER TABLE official_decrees ENABLE ROW LEVEL SECURITY;`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='generators_pending' AND policyname='allow_all_select') THEN
         CREATE POLICY allow_all_select ON generators_pending FOR SELECT USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='generators_pending' AND policyname='allow_all_insert') THEN
         CREATE POLICY allow_all_insert ON generators_pending FOR INSERT WITH CHECK (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='generators_pending' AND policyname='allow_all_delete') THEN
         CREATE POLICY allow_all_delete ON generators_pending FOR DELETE USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pending_operators' AND policyname='allow_all_select') THEN
         CREATE POLICY allow_all_select ON pending_operators FOR SELECT USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pending_operators' AND policyname='allow_all_insert') THEN
         CREATE POLICY allow_all_insert ON pending_operators FOR INSERT WITH CHECK (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pending_operators' AND policyname='allow_all_delete') THEN
         CREATE POLICY allow_all_delete ON pending_operators FOR DELETE USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='maintenance_logs' AND policyname='allow_all_select') THEN
         CREATE POLICY allow_all_select ON maintenance_logs FOR SELECT USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='maintenance_logs' AND policyname='allow_all_insert') THEN
         CREATE POLICY allow_all_insert ON maintenance_logs FOR INSERT WITH CHECK (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='official_decrees' AND policyname='allow_all_select') THEN
         CREATE POLICY allow_all_select ON official_decrees FOR SELECT USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='official_decrees' AND policyname='allow_all_insert') THEN
         CREATE POLICY allow_all_insert ON official_decrees FOR INSERT WITH CHECK (true);
       END IF;
     END $$;`,
  ];

  for (let i = 0; i < queries.length; i++) {
    try {
      await runSQL(queries[i]);
      console.log(`Query ${i + 1}/${queries.length}: OK`);
    } catch (err) {
      console.error(`Query ${i + 1}/${queries.length}: FAILED -`, err.message);
    }
  }
  console.log('Done.');
}
main();
