require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // Step 1: add columns to generators table
  const colQueries = [
    `ALTER TABLE generators ADD COLUMN IF NOT EXISTS price_per_amp NUMERIC(10,2) DEFAULT 15000`,
    `ALTER TABLE generators ADD COLUMN IF NOT EXISTS capacity_amps INTEGER DEFAULT 100`,
    `ALTER TABLE generators ADD COLUMN IF NOT EXISTS owner_name TEXT DEFAULT ''`,
    `ALTER TABLE generators ADD COLUMN IF NOT EXISTS owner_phone TEXT DEFAULT ''`,
    `ALTER TABLE generators ADD COLUMN IF NOT EXISTS address TEXT DEFAULT ''`,
    `ALTER TABLE generators ADD COLUMN IF NOT EXISTS fuel_quota INTEGER DEFAULT 500`,
  ];

  for (const q of colQueries) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
    });
  }

  // Use supabase-js to insert and check tables exist via select
  // First let's try to create via a stored procedure or direct check

  // Check existing tables
  const { data: tables } = await sb
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['generator_logs', 'generator_subscribers']);
  
  console.log('Existing tables:', tables?.map(t => t.table_name));

  // Try inserting to see if tables exist
  const { error: logErr } = await sb.from('generator_logs').select('id').limit(1);
  console.log('generator_logs exists:', !logErr, logErr?.message);
  
  const { error: subErr } = await sb.from('generator_subscribers').select('id').limit(1);
  console.log('generator_subscribers exists:', !subErr, subErr?.message);
}
run();
