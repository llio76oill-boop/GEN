/**
 * purge-mock-data.js — حذف جميع البيانات الوهمية من قاعدة البيانات
 *
 * يحذف كل سجل يحمل is_mock = true من جداول:
 *   generators, operators, owned_generators, owners, faults, notifications
 *
 * Run: node scripts/purge-mock-data.js
 */
const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');

const envPath    = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.+)`, 'm'));
  return match ? match[1].trim() : null;
};

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_KEY  = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env vars in .env.local');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function purgeTable(table) {
  const { count, error } = await sb
    .from(table)
    .delete({ count: 'exact' })
    .eq('is_mock', true);

  if (error) {
    // Some tables may not have is_mock — skip gracefully
    if (error.code === '42703') {
      console.log(`  ⏭  ${table}: no is_mock column — skipped`);
    } else {
      console.error(`  ✗  ${table}: ${error.message}`);
    }
  } else {
    console.log(`  ✓  ${table}: deleted ${count ?? 0} mock rows`);
  }
}

async function main() {
  console.log('Purging mock data from:', SUPABASE_URL, '\n');

  // Order matters — child tables before parent to avoid FK violations
  // operators → owned_generators → owners (cascade handles it via FK)
  // But let's be explicit:
  const tables = [
    'notifications',
    'faults',
    'operators',
    'owned_generators',
    'generators',
    'owners',
  ];

  for (const table of tables) {
    await purgeTable(table);
  }

  console.log('\n✅ Purge complete. Only real data remains.');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
