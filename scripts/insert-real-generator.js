/**
 * Insert the first real generator into Supabase.
 * This generator is linked to ThingSpeak channel 3334757 (Field1 = Voltage).
 * Location: حي التأميم - 30 تموز, الرمادي
 *
 * Run: node scripts/insert-real-generator.js
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.+)`, 'm'));
  return match ? match[1].trim() : null;
};

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_KEY  = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

console.log('Using project:', SUPABASE_URL);
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log('Inserting first real generator...\n');

  // 1) Insert owner
  const { data: owner, error: ownerErr } = await sb
    .from('owners')
    .insert({
      name:         'مواطن الأنبار الأول',
      phone:        '+964 790 000 0001',
      initials:     'م أ',
      owned_since:  'أبريل 2026',
      is_mock:      false,
    })
    .select('id')
    .single();

  if (ownerErr) {
    console.error('❌ Owner insert failed:', ownerErr.message);
    process.exit(1);
  }
  console.log('✓ Owner inserted — id:', owner.id);

  // 2) Insert the owned generator with ThingSpeak credentials + real coordinates
  const { data: gen, error: genErr } = await sb
    .from('owned_generators')
    .insert({
      owner_id:              owner.id,
      code:                  'G-TS01',
      area:                  'الرمادي - حي التأميم - 30 تموز',
      power:                 50,
      status:                'online-gen',
      total_hours:           0,
      license_number:        'LIC-TS-2026-001',
      monthly_fuel_quota:    500,
      thingspeak_channel_id: '3334757',
      thingspeak_read_key:   'O42YI3R3AGDW5WGP',
      is_mock:               false,
    })
    .select('id')
    .single();

  if (genErr) {
    console.error('❌ Generator insert failed:', genErr.message);
    process.exit(1);
  }
  console.log('✓ Generator inserted — id:', gen.id, '— code: G-TS01');

  // 3) Insert into generators table (for map display) with real coordinates
  const { error: mapErr } = await sb
    .from('generators')
    .insert({
      lat:     33.417687,
      lng:     43.267841,
      status:  'online-gen',
      power:   50,
      area:    'التأميم',
      hours:   0,
      is_mock: false,
    });

  if (mapErr) {
    console.error('❌ Map generator insert failed (non-fatal):', mapErr.message);
  } else {
    console.log('✓ Map generator pin inserted at 33.417687, 43.267841');
  }

  console.log('\n✅ Done! Generator G-TS01 is now in the database.');
  console.log('   ThingSpeak channel: 3334757');
  console.log('   Location: الرمادي - حي التأميم - 30 تموز');
  console.log('   View profile at: /dashboard/generators/G-TS01');
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
