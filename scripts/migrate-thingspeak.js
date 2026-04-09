/**
 * Migration script - adds ThingSpeak columns to owned_generators table
 * Run: node scripts/migrate-thingspeak.js
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.+)`, 'm'));
  return match ? match[1].trim() : null;
};

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_KEY  = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log('Running migration on:', SUPABASE_URL);

  // Use sb.sql for DDL (available in @supabase/supabase-js v2.x)
  if (typeof sb.sql !== 'function') {
    console.error('sb.sql is not available. Please run this SQL manually in Supabase Dashboard > SQL Editor:');
    console.log(`
ALTER TABLE owned_generators
  ADD COLUMN IF NOT EXISTS thingspeak_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS thingspeak_read_key   TEXT,
  ADD COLUMN IF NOT EXISTS license_number        TEXT,
  ADD COLUMN IF NOT EXISTS monthly_fuel_quota    INTEGER DEFAULT 0;
    `);
    process.exit(0);
  }

  try {
    await sb.sql`ALTER TABLE owned_generators ADD COLUMN IF NOT EXISTS thingspeak_channel_id TEXT`;
    console.log('✓ thingspeak_channel_id added');
    await sb.sql`ALTER TABLE owned_generators ADD COLUMN IF NOT EXISTS thingspeak_read_key TEXT`;
    console.log('✓ thingspeak_read_key added');
    await sb.sql`ALTER TABLE owned_generators ADD COLUMN IF NOT EXISTS license_number TEXT`;
    console.log('✓ license_number added');
    await sb.sql`ALTER TABLE owned_generators ADD COLUMN IF NOT EXISTS monthly_fuel_quota INTEGER DEFAULT 0`;
    console.log('✓ monthly_fuel_quota added');
    console.log('\nMigration complete!');
  } catch (e) {
    console.error('Migration failed:', e.message);
  }
}

main();
