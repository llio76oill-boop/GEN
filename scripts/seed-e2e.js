/**
 * E2E seed script — purges demo/mock data, inserts verified test entities.
 * Run: node scripts/seed-e2e.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const sb = createClient(URL, KEY);

async function run() {
  console.log('Connecting to:', URL, '\n');

  // ── 1. Purge all bills ────────────────────────────────────────────────────
  const { error: e1, count: c1 } = await sb
    .from('bills')
    .delete({ count: 'exact' })
    .not('id', 'is', null);
  if (e1) throw e1;
  console.log(`Deleted ${c1 ?? '?'} bills`);

  // ── 2. Purge all subscribers ──────────────────────────────────────────────
  const { error: e2, count: c2 } = await sb
    .from('subscribers')
    .delete({ count: 'exact' })
    .not('id', 'is', null);
  if (e2) throw e2;
  console.log(`Deleted ${c2 ?? '?'} subscribers`);

  // ── 3. Purge mock owners (CASCADE → owned_generators → operators) ─────────
  const { error: e3, count: c3 } = await sb
    .from('owners')
    .delete({ count: 'exact' })
    .eq('is_mock', true);
  if (e3) throw e3;
  console.log(`Deleted ${c3 ?? '?'} mock owners\n`);

  // ── 4. Insert test owner ──────────────────────────────────────────────────
  const { data: owner, error: e4 } = await sb
    .from('owners')
    .insert({
      name:        'صاحب المولد تجربة النظام الحالي',
      phone:       '+964 790 000 0001',
      initials:    'ص م',
      owned_since: 'أبريل 2026',
      is_mock:     false,
    })
    .select('id')
    .single();
  if (e4) throw e4;
  console.log(`Inserted owner id=${owner.id}`);

  // ── 5. Insert owned generator (linked to live ThingSpeak channel) ─────────
  const { data: ownedGen, error: e5 } = await sb
    .from('owned_generators')
    .insert({
      owner_id:              owner.id,
      code:                  'G-TS01',
      area:                  'الرمادي - حي التأميم',
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
  if (e5) throw e5;
  console.log(`Inserted owned_generator id=${ownedGen.id}`);

  // ── 6. Insert test operator ───────────────────────────────────────────────
  const { error: e6 } = await sb
    .from('operators')
    .insert({
      owned_gen_id: ownedGen.id,
      name:         'مشغل النظام التجريبي',
      phone:        '+964 790 000 0002',
      shift:        'صباحي',
      shift_start:  '06:00',
      shift_end:    '14:00',
      active:       true,
      is_mock:      false,
    });
  if (e6) throw e6;
  console.log(`Inserted test operator`);

  // ── 7. Insert test subscriber ─────────────────────────────────────────────
  const { data: sub, error: e7 } = await sb
    .from('subscribers')
    .insert({
      sub_code:    'SUB-A1-001',
      full_name:   'مستخدم النظام الحالي',
      region_id:   'A1',
      owned_gen_id: ownedGen.id,
      amps:        10,
      phone:       '07900000001',
      active:      true,
    })
    .select('id')
    .single();
  if (e7) throw e7;
  console.log(`Inserted subscriber id=${sub.id}`);

  // ── 8. Insert pending bill: 10A × 10,000 IQD + 500 commission = 100,500 ──
  const { error: e8 } = await sb
    .from('bills')
    .insert({
      subscriber_id: sub.id,
      month_label:   '2026-04',
      amps:          10,
      price_per_amp: 10000,
      commission:    500,
      total_iqd:     100500,
      status:        'pending',
    });
  if (e8) throw e8;
  console.log(`Inserted pending bill: 10A × 10,000 + 500 = 100,500 IQD\n`);

  console.log('Seed completed.');
}

run().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});
