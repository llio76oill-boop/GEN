// Run AFTER supabase/gen-record-schema.sql has been applied
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Generator metadata ────────────────────────────────────────────────────────
const GEN_META = [
  { id:1,  owner_name:'أحمد كريم ياسين',    owner_phone:'07801234560', address:'حي التأميم، شارع الحرية، الرمادي',          capacity_amps:200, price_per_amp:15000, fuel_quota:600, notes:'' },
  { id:2,  owner_name:'محمد صالح عبيد',      owner_phone:'07801234561', address:'حي الصوفية، شارع الأمل، الرمادي',           capacity_amps:250, price_per_amp:15000, fuel_quota:700, notes:'' },
  { id:3,  owner_name:'عبد الرحمن خليل',     owner_phone:'07801234562', address:'حي الملعب، بالقرب من الملعب البلدي، الرمادي', capacity_amps:200, price_per_amp:15000, fuel_quota:600, notes:'' },
  { id:4,  owner_name:'سامي حسين الدليمي',   owner_phone:'07801234563', address:'حي البكر، شارع الزهراء، الرمادي',           capacity_amps:350, price_per_amp:15000, fuel_quota:900, notes:'' },
  { id:5,  owner_name:'علي جاسم الفهداوي',   owner_phone:'07801234564', address:'حي 8 شباط، المنطقة الصناعية، الرمادي',      capacity_amps:150, price_per_amp:15000, fuel_quota:500, notes:'' },
  { id:6,  owner_name:'حسين عبد الله النعيمي',owner_phone:'07801234565', address:'حي الأندلس، شارع بغداد، الرمادي',          capacity_amps:280, price_per_amp:15000, fuel_quota:750, notes:'' },
  { id:7,  owner_name:'طارق محمود السامرائي', owner_phone:'07801234566', address:'حي العمال، قرب المستشفى العام، الرمادي',    capacity_amps:400, price_per_amp:12000, fuel_quota:1000, notes:'مولد صناعي كبير' },
  { id:8,  owner_name:'ياسر فاضل الجميلي',   owner_phone:'07801234567', address:'حي ثلاثين تموز، شارع الشهداء، الرمادي',    capacity_amps:230, price_per_amp:15000, fuel_quota:650, notes:'' },
  { id:9,  owner_name:'كريم صادق عبد العزيز', owner_phone:'07801234568', address:'شارع عشرين، المنطقة المركزية، الرمادي',    capacity_amps:320, price_per_amp:12000, fuel_quota:850, notes:'' },
  { id:10, owner_name:'زياد عمر الحديثي',    owner_phone:'07801234569', address:'حي المعلمين، قرب المدرسة المركزية، الرمادي', capacity_amps:200, price_per_amp:15000, fuel_quota:600, notes:'' },
];

// ── Operators ─────────────────────────────────────────────────────────────────
function buildOperators(genId) {
  const names = [
    ['كرار علي','07901000001','صباحي','07:00','15:00'],
    ['لؤي حسن','07901000002','مسائي','15:00','23:00'],
    ['نضال عمر','07901000003','ليلي','23:00','07:00'],
  ];
  return names.map(([name, phone, shift, shift_start, shift_end]) => ({
    gen_id: genId, name, phone, shift, shift_start, shift_end, active: true,
  }));
}

// ── Subscribers ───────────────────────────────────────────────────────────────
const SUBSCRIBER_NAMES = [
  'أبو علي الدليمي','أم محمد الفهداوي','حسام طارق','نور الدين خالد','رائد صبيح',
  'زينب عبد الكريم','يوسف سالم','سرى جاسم','لقاء حميد','وائل عدنان',
  'منار إبراهيم','أحمد ستار','إيمان حسن','نوار فارس','قاسم مطلك',
  'هديل عامر','عباس كاظم','تبارك وليد','مصطفى رياض','شيماء فؤاد',
];

function buildSubscribers(genId, count, pricePerAmp) {
  const subs = [];
  for (let i = 0; i < count; i++) {
    const amps = [5,5,10,10,10,15,15,20][Math.floor(Math.random() * 8)];
    const sub_type = amps >= 15 ? 'commercial' : 'residential';
    subs.push({
      gen_id:      genId,
      full_name:   SUBSCRIBER_NAMES[i % SUBSCRIBER_NAMES.length],
      phone:       `0790${String(2000000 + genId * 1000 + i).padStart(7,'0')}`,
      amps,
      sub_type,
      monthly_fee: amps * pricePerAmp,
      active:      true,
    });
  }
  return subs;
}

// ── Operation logs ────────────────────────────────────────────────────────────
function buildLogs(genId) {
  const logs = [];
  const now = new Date('2026-04-23T22:00:00+03:00');
  // 30 days of logs, ~3 events per day
  for (let day = 29; day >= 0; day--) {
    const base = new Date(now);
    base.setDate(base.getDate() - day);

    // Daily start
    base.setHours(7, 0, 0, 0);
    logs.push({ gen_id: genId, event: 'start', note: 'تشغيل يومي', logged_at: new Date(base).toISOString(), logged_by: 'مشغل صباحي' });

    // Midday continue note every 5 days
    if (day % 5 === 0) {
      base.setHours(13, 0, 0, 0);
      logs.push({ gen_id: genId, event: 'refuel', note: 'إضافة وقود', fuel_added: 150, logged_at: new Date(base).toISOString(), logged_by: 'مشغل صباحي' });
    }

    // Daily stop
    base.setHours(23, 30, 0, 0);
    logs.push({ gen_id: genId, event: 'stop', note: 'إيقاف ليلي', logged_at: new Date(base).toISOString(), logged_by: 'مشغل ليلي' });
  }
  return logs;
}

// ── Seed ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('Seeding generator metadata...');
  for (const m of GEN_META) {
    const { error } = await sb.from('generators').update({
      owner_name: m.owner_name, owner_phone: m.owner_phone, address: m.address,
      capacity_amps: m.capacity_amps, price_per_amp: m.price_per_amp,
      fuel_quota: m.fuel_quota, notes: m.notes,
    }).eq('id', m.id);
    if (error) console.error('meta err gen', m.id, error.message);
    else console.log('  meta gen', m.id, '✓');
  }

  console.log('\nSeeding operators...');
  for (const m of GEN_META) {
    const ops = buildOperators(m.id);
    // Delete old first
    await sb.from('generator_operators').delete().eq('gen_id', m.id);
    const { error } = await sb.from('generator_operators').insert(ops);
    if (error) console.error('ops err gen', m.id, error.message);
    else console.log('  ops gen', m.id, '✓ (3 operators)');
  }

  console.log('\nSeeding subscribers...');
  const subCounts = [18,22,15,28,12,20,35,17,25,16];
  for (let i = 0; i < GEN_META.length; i++) {
    const m = GEN_META[i];
    const subs = buildSubscribers(m.id, subCounts[i], m.price_per_amp);
    await sb.from('generator_subscribers').delete().eq('gen_id', m.id);
    const { error } = await sb.from('generator_subscribers').insert(subs);
    if (error) console.error('subs err gen', m.id, error.message);
    else console.log('  subs gen', m.id, '✓ (' + subs.length + ' subscribers)');
  }

  console.log('\nSeeding operation logs...');
  for (const m of GEN_META) {
    const logs = buildLogs(m.id);
    await sb.from('generator_logs').delete().eq('gen_id', m.id);
    const { error } = await sb.from('generator_logs').insert(logs);
    if (error) console.error('logs err gen', m.id, error.message);
    else console.log('  logs gen', m.id, '✓ (' + logs.length + ' events)');
  }

  console.log('\nAll done!');
}

seed();
