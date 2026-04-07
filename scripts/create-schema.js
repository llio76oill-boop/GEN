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
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        } else {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const queries = [
    // 1. Create tables
    `CREATE TABLE IF NOT EXISTS generators (
      id SERIAL PRIMARY KEY, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('online-grid','online-gen','fault','offline')),
      power DOUBLE PRECISION NOT NULL, area TEXT NOT NULL, hours INTEGER NOT NULL DEFAULT 0,
      is_mock BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,

    `CREATE TABLE IF NOT EXISTS owners (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, initials TEXT NOT NULL,
      owned_since TEXT NOT NULL, is_mock BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,

    `CREATE TABLE IF NOT EXISTS owned_generators (
      id SERIAL PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
      code TEXT NOT NULL, area TEXT NOT NULL, power DOUBLE PRECISION NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('online-grid','online-gen','fault','offline')),
      total_hours INTEGER NOT NULL DEFAULT 0, is_mock BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,

    `CREATE TABLE IF NOT EXISTS operators (
      id SERIAL PRIMARY KEY, owned_gen_id INTEGER NOT NULL REFERENCES owned_generators(id) ON DELETE CASCADE,
      name TEXT NOT NULL, phone TEXT NOT NULL,
      shift TEXT NOT NULL CHECK (shift IN ('صباحي','مسائي','ليلي')),
      shift_start TEXT NOT NULL, shift_end TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT FALSE, is_mock BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,

    `CREATE TABLE IF NOT EXISTS faults (
      id SERIAL PRIMARY KEY, g_id TEXT NOT NULL, location TEXT NOT NULL, type TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('critical','warning','info')),
      time_label TEXT NOT NULL, icon TEXT NOT NULL DEFAULT 'WifiOff',
      is_mock BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY, type TEXT NOT NULL CHECK (type IN ('fault','warning','info','success')),
      title TEXT NOT NULL, body TEXT NOT NULL, time_label TEXT NOT NULL,
      read BOOLEAN NOT NULL DEFAULT FALSE, is_mock BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,

    `CREATE TABLE IF NOT EXISTS areas (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE,
      lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL
    );`,

    // 2. Enable RLS
    `ALTER TABLE generators ENABLE ROW LEVEL SECURITY;
     ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
     ALTER TABLE owned_generators ENABLE ROW LEVEL SECURITY;
     ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
     ALTER TABLE faults ENABLE ROW LEVEL SECURITY;
     ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
     ALTER TABLE areas ENABLE ROW LEVEL SECURITY;`,

    // 3. Policies - SELECT
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='generators' AND policyname='allow_all_select') THEN
         CREATE POLICY allow_all_select ON generators FOR SELECT USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='owners' AND policyname='allow_all_select') THEN
         CREATE POLICY allow_all_select ON owners FOR SELECT USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='owned_generators' AND policyname='allow_all_select') THEN
         CREATE POLICY allow_all_select ON owned_generators FOR SELECT USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='operators' AND policyname='allow_all_select') THEN
         CREATE POLICY allow_all_select ON operators FOR SELECT USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='faults' AND policyname='allow_all_select') THEN
         CREATE POLICY allow_all_select ON faults FOR SELECT USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='allow_all_select') THEN
         CREATE POLICY allow_all_select ON notifications FOR SELECT USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='areas' AND policyname='allow_all_select') THEN
         CREATE POLICY allow_all_select ON areas FOR SELECT USING (true);
       END IF;
     END $$;`,

    // 4. Policies - INSERT
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='generators' AND policyname='allow_all_insert') THEN
         CREATE POLICY allow_all_insert ON generators FOR INSERT WITH CHECK (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='owners' AND policyname='allow_all_insert') THEN
         CREATE POLICY allow_all_insert ON owners FOR INSERT WITH CHECK (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='owned_generators' AND policyname='allow_all_insert') THEN
         CREATE POLICY allow_all_insert ON owned_generators FOR INSERT WITH CHECK (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='operators' AND policyname='allow_all_insert') THEN
         CREATE POLICY allow_all_insert ON operators FOR INSERT WITH CHECK (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='faults' AND policyname='allow_all_insert') THEN
         CREATE POLICY allow_all_insert ON faults FOR INSERT WITH CHECK (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='allow_all_insert') THEN
         CREATE POLICY allow_all_insert ON notifications FOR INSERT WITH CHECK (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='areas' AND policyname='allow_all_insert') THEN
         CREATE POLICY allow_all_insert ON areas FOR INSERT WITH CHECK (true);
       END IF;
     END $$;`,

    // 5. Policies - DELETE & UPDATE
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='generators' AND policyname='allow_all_delete') THEN
         CREATE POLICY allow_all_delete ON generators FOR DELETE USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='owners' AND policyname='allow_all_delete') THEN
         CREATE POLICY allow_all_delete ON owners FOR DELETE USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='owned_generators' AND policyname='allow_all_delete') THEN
         CREATE POLICY allow_all_delete ON owned_generators FOR DELETE USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='operators' AND policyname='allow_all_delete') THEN
         CREATE POLICY allow_all_delete ON operators FOR DELETE USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='faults' AND policyname='allow_all_delete') THEN
         CREATE POLICY allow_all_delete ON faults FOR DELETE USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='allow_all_delete') THEN
         CREATE POLICY allow_all_delete ON notifications FOR DELETE USING (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='areas' AND policyname='allow_all_delete') THEN
         CREATE POLICY allow_all_delete ON areas FOR DELETE USING (true);
       END IF;
     END $$;`,

    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='generators' AND policyname='allow_all_update') THEN
         CREATE POLICY allow_all_update ON generators FOR UPDATE USING (true) WITH CHECK (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='owners' AND policyname='allow_all_update') THEN
         CREATE POLICY allow_all_update ON owners FOR UPDATE USING (true) WITH CHECK (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='owned_generators' AND policyname='allow_all_update') THEN
         CREATE POLICY allow_all_update ON owned_generators FOR UPDATE USING (true) WITH CHECK (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='operators' AND policyname='allow_all_update') THEN
         CREATE POLICY allow_all_update ON operators FOR UPDATE USING (true) WITH CHECK (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='faults' AND policyname='allow_all_update') THEN
         CREATE POLICY allow_all_update ON faults FOR UPDATE USING (true) WITH CHECK (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='allow_all_update') THEN
         CREATE POLICY allow_all_update ON notifications FOR UPDATE USING (true) WITH CHECK (true);
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='areas' AND policyname='allow_all_update') THEN
         CREATE POLICY allow_all_update ON areas FOR UPDATE USING (true) WITH CHECK (true);
       END IF;
     END $$;`,
  ];

  for (let i = 0; i < queries.length; i++) {
    try {
      const result = await runSQL(queries[i]);
      console.log(`Query ${i + 1}/${queries.length}: OK`);
    } catch (err) {
      console.error(`Query ${i + 1}/${queries.length}: FAILED -`, err.message);
    }
  }
  console.log('Schema creation complete.');
}

main();
