require('dotenv').config({ path: '.env.local' });
const https = require('https');

// Extract project ref from URL: https://PROJECTREF.supabase.co
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const projectRef = url.replace('https://', '').split('.')[0];
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Project ref:', projectRef);

function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${projectRef}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        else resolve(data);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const tables = [
  `CREATE TABLE IF NOT EXISTS generators_pending (
    id             SERIAL PRIMARY KEY,
    owner_name     TEXT NOT NULL,
    owner_phone    TEXT NOT NULL,
    license_no     TEXT NOT NULL,
    lat            DOUBLE PRECISION NOT NULL,
    lng            DOUBLE PRECISION NOT NULL,
    fuel_quota     INTEGER NOT NULL DEFAULT 0,
    price_per_hour NUMERIC NOT NULL DEFAULT 38,
    status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected')),
    is_mock        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS pending_operators (
    id             SERIAL PRIMARY KEY,
    pending_gen_id INTEGER NOT NULL REFERENCES generators_pending(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    phone          TEXT NOT NULL,
    shift_start    TEXT NOT NULL,
    shift_end      TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_logs (
    id             SERIAL PRIMARY KEY,
    generator_code TEXT NOT NULL,
    owner_id       INTEGER,
    log_type       TEXT NOT NULL,
    description    TEXT NOT NULL,
    logged_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_mock        BOOLEAN NOT NULL DEFAULT FALSE
  )`,
  `CREATE TABLE IF NOT EXISTS official_decrees (
    id           SERIAL PRIMARY KEY,
    title        TEXT NOT NULL,
    body         TEXT,
    pdf_url      TEXT,
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_mock      BOOLEAN NOT NULL DEFAULT FALSE
  )`,
  `ALTER TABLE generators_pending ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE pending_operators  ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE maintenance_logs   ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE official_decrees   ENABLE ROW LEVEL SECURITY`,
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
   END $$`,
];

async function main() {
  for (let i = 0; i < tables.length; i++) {
    try {
      await runSQL(tables[i]);
      console.log('OK  [' + (i + 1) + '/' + tables.length + ']');
    } catch (e) {
      // 401 means Management API token rejected — fall back to direct insert test
      if (e.message.includes('401')) {
        console.log('Management API 401 — trying direct table probe...');
        // Use supabase-js to check if table exists by selecting from it
        const { createClient } = require('@supabase/supabase-js');
        const sb = createClient(url, serviceKey);
        const { error } = await sb.from('generators_pending').select('id').limit(1);
        if (!error) {
          console.log('Table generators_pending already exists!');
          return;
        }
        console.log('Table missing. Please run the SQL in Supabase Dashboard > SQL Editor.');
        console.log('SQL file: supabase/pending-schema.sql');
        process.exit(1);
      }
      console.log('FAIL [' + (i + 1) + '/' + tables.length + ']:', e.message.slice(0, 120));
    }
  }
  console.log('All done!');
}

main();
