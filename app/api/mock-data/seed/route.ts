import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/* ---------- LCG (same as data/generators.ts) ---------- */
function lcg(seed: number) {
  let n = seed;
  return () => { n = (n * 9301 + 49297) % 233280; return n / 233280; };
}

const RAMADI_AREAS = [
  { name: 'المركز',     lat: 33.4258, lng: 43.2994 },
  { name: 'الأندلس',   lat: 33.4300, lng: 43.3200 },
  { name: 'المعارف',   lat: 33.4200, lng: 43.3100 },
  { name: 'التميم',    lat: 33.4150, lng: 43.2850 },
  { name: 'الحوز',     lat: 33.4400, lng: 43.2700 },
  { name: 'الجزيرة',  lat: 33.4550, lng: 43.3000 },
  { name: 'الكرامة',   lat: 33.4350, lng: 43.2500 },
  { name: 'الضباط',    lat: 33.4500, lng: 43.3400 },
  { name: 'البو فرج',  lat: 33.3850, lng: 43.3500 },
  { name: 'النهضة',    lat: 33.4200, lng: 43.3300 },
  { name: 'المرور',    lat: 33.4400, lng: 43.3050 },
  { name: 'الصناعية', lat: 33.4000, lng: 43.3100 },
  { name: 'الوريج',    lat: 33.4600, lng: 43.2850 },
  { name: 'البوعيثة', lat: 33.3950, lng: 43.2900 },
  { name: 'المنصور',   lat: 33.4100, lng: 43.2650 },
];

const WEIGHTS: string[] = [
  'online-grid','online-grid','online-grid','online-grid',
  'online-gen','online-gen','online-gen',
  'fault','fault','offline',
];

export async function POST() {
  try {
    const rng = lcg(42);

    // 1) Areas
    await supabaseAdmin.from('areas').upsert(
      RAMADI_AREAS.map((a, i) => ({ id: i + 1, name: a.name, lat: a.lat, lng: a.lng })),
      { onConflict: 'name' }
    );

    // 2) Generators
    const gens = Array.from({ length: 300 }, (_, i) => {
      const area = RAMADI_AREAS[Math.floor(rng() * RAMADI_AREAS.length)];
      return {
        id: i + 1,
        lat: area.lat + (rng() - 0.5) * 0.028,
        lng: area.lng + (rng() - 0.5) * 0.028,
        status: WEIGHTS[Math.floor(rng() * WEIGHTS.length)],
        power: Math.round((rng() * 450 + 50) * 10) / 10,
        area: area.name,
        hours: Math.floor(rng() * 8760),
        is_mock: true,
      };
    });
    for (let i = 0; i < gens.length; i += 100) {
      const { error } = await supabaseAdmin.from('generators').upsert(gens.slice(i, i + 100), { onConflict: 'id' });
      if (error) throw error;
    }

    // 3) Owners
    const OWNERS_DATA = [
      { name: 'أحمد محمد السامرائي', phone: '+964 790 123 4567', initials: 'أم', owned_since: 'مارس ٢٠٢٣', generators: [
        { code: 'G-0042', area: 'المركز', power: 380, status: 'online-grid', total_hours: 6240, operators: [
          { name: 'كريم فهد حسن', phone: '+964 770 111 0001', shift: 'صباحي', shift_start: '06:00', shift_end: '14:00', active: true },
          { name: 'ياسر علي محمود', phone: '+964 780 111 0002', shift: 'مسائي', shift_start: '14:00', shift_end: '22:00', active: false },
          { name: 'سامر خليل إبراهيم', phone: '+964 750 111 0003', shift: 'ليلي', shift_start: '22:00', shift_end: '06:00', active: false },
        ]},
        { code: 'G-0089', area: 'الأندلس', power: 210, status: 'online-gen', total_hours: 4800, operators: [
          { name: 'باسم حميد ناصر', phone: '+964 790 222 0004', shift: 'صباحي', shift_start: '06:00', shift_end: '14:00', active: true },
          { name: 'رائد سعد عمر', phone: '+964 770 222 0005', shift: 'مسائي', shift_start: '14:00', shift_end: '22:00', active: false },
        ]},
      ]},
      { name: 'علي حسين الجبوري', phone: '+964 781 234 5678', initials: 'عح', owned_since: 'يونيو ٢٠٢٢', generators: [
        { code: 'G-0156', area: 'الكرامة', power: 450, status: 'online-grid', total_hours: 7100, operators: [
          { name: 'حيدر عبد الله رضا', phone: '+964 790 333 0006', shift: 'صباحي', shift_start: '06:00', shift_end: '14:00', active: true },
          { name: 'مصطفى قاسم حسن', phone: '+964 770 333 0007', shift: 'مسائي', shift_start: '14:00', shift_end: '22:00', active: false },
          { name: 'أمير فلاح سليمان', phone: '+964 780 333 0008', shift: 'ليلي', shift_start: '22:00', shift_end: '06:00', active: false },
        ]},
      ]},
      { name: 'محمد عبد الرحمن الدليمي', phone: '+964 772 345 6789', initials: 'مع', owned_since: 'يناير ٢٠٢٤', generators: [
        { code: 'G-0213', area: 'النهضة', power: 175, status: 'fault', total_hours: 2100, operators: [
          { name: 'طارق نزار فيصل', phone: '+964 790 444 0009', shift: 'صباحي', shift_start: '07:00', shift_end: '15:00', active: true },
          { name: 'أنس ماجد كريم', phone: '+964 750 444 0010', shift: 'ليلي', shift_start: '23:00', shift_end: '07:00', active: false },
        ]},
        { code: 'G-0247', area: 'التميم', power: 320, status: 'online-gen', total_hours: 5500, operators: [
          { name: 'عمر زيد الراوي', phone: '+964 770 444 0011', shift: 'صباحي', shift_start: '07:00', shift_end: '15:00', active: false },
          { name: 'لؤي بلال عجيل', phone: '+964 780 444 0012', shift: 'مسائي', shift_start: '15:00', shift_end: '23:00', active: true },
        ]},
        { code: 'G-0301', area: 'الحوز', power: 290, status: 'offline', total_hours: 1200, operators: [
          { name: 'جمال ثائر شاكر', phone: '+964 790 444 0013', shift: 'صباحي', shift_start: '08:00', shift_end: '16:00', active: false },
        ]},
      ]},
      { name: 'خالد إبراهيم الفهداوي', phone: '+964 783 456 7890', initials: 'خإ', owned_since: 'سبتمبر ٢٠٢٣', generators: [
        { code: 'G-0078', area: 'الجزيرة', power: 500, status: 'online-grid', total_hours: 7800, operators: [
          { name: 'عبد الكريم منصور', phone: '+964 770 555 0014', shift: 'صباحي', shift_start: '06:00', shift_end: '14:00', active: true },
          { name: 'أيمن ثامر نصير', phone: '+964 780 555 0015', shift: 'مسائي', shift_start: '14:00', shift_end: '22:00', active: false },
          { name: 'زياد حارث مجيد', phone: '+964 750 555 0016', shift: 'ليلي', shift_start: '22:00', shift_end: '06:00', active: false },
        ]},
        { code: 'G-0115', area: 'الضباط', power: 340, status: 'online-gen', total_hours: 6100, operators: [
          { name: 'فراس نضال صالح', phone: '+964 790 555 0017', shift: 'صباحي', shift_start: '07:00', shift_end: '15:00', active: false },
          { name: 'حسام علاء الدين', phone: '+964 770 555 0018', shift: 'مسائي', shift_start: '15:00', shift_end: '23:00', active: true },
        ]},
      ]},
      { name: 'سعد عمر البو فرجي', phone: '+964 784 567 8901', initials: 'سع', owned_since: 'فبراير ٢٠٢٤', generators: [
        { code: 'G-0192', area: 'البو فرج', power: 155, status: 'online-gen', total_hours: 3400, operators: [
          { name: 'نبيل جاسم حمود', phone: '+964 790 666 0019', shift: 'صباحي', shift_start: '07:00', shift_end: '15:00', active: true },
          { name: 'رشيد كامل عودة', phone: '+964 780 666 0020', shift: 'ليلي', shift_start: '23:00', shift_end: '07:00', active: false },
        ]},
      ]},
      { name: 'يوسف ناصر العبيدي', phone: '+964 785 678 9012', initials: 'ين', owned_since: 'أبريل ٢٠٢٢', generators: [
        { code: 'G-0033', area: 'الوريج', power: 420, status: 'online-grid', total_hours: 7200, operators: [
          { name: 'علاء حسن عباس', phone: '+964 770 777 0021', shift: 'صباحي', shift_start: '06:00', shift_end: '14:00', active: false },
          { name: 'تحسين إياد ضياء', phone: '+964 750 777 0022', shift: 'مسائي', shift_start: '14:00', shift_end: '22:00', active: true },
          { name: 'أحمد بشير واثق', phone: '+964 790 777 0023', shift: 'ليلي', shift_start: '22:00', shift_end: '06:00', active: false },
        ]},
        { code: 'G-0264', area: 'المنصور', power: 260, status: 'online-grid', total_hours: 5800, operators: [
          { name: 'قصي لؤي محسن', phone: '+964 780 777 0024', shift: 'صباحي', shift_start: '07:00', shift_end: '15:00', active: true },
          { name: 'صادق وائل راضي', phone: '+964 770 777 0025', shift: 'مسائي', shift_start: '15:00', shift_end: '23:00', active: false },
        ]},
        { code: 'G-0298', area: 'البوعيثة', power: 145, status: 'fault', total_hours: 1800, operators: [
          { name: 'حمزة رافد مؤيد', phone: '+964 790 777 0026', shift: 'صباحي', shift_start: '07:00', shift_end: '15:00', active: false },
        ]},
      ]},
    ];

    for (const ownerData of OWNERS_DATA) {
      const { generators, ...ownerFields } = ownerData;
      const { data: ownerRow, error: ownerErr } = await supabaseAdmin.from('owners')
        .insert({ ...ownerFields, is_mock: true }).select('id').single();
      if (ownerErr) throw ownerErr;

      for (const gen of generators) {
        const { operators, ...genFields } = gen;
        const { data: genRow, error: genErr } = await supabaseAdmin.from('owned_generators')
          .insert({ ...genFields, owner_id: ownerRow!.id, is_mock: true }).select('id').single();
        if (genErr) throw genErr;

        if (operators.length > 0) {
          const { error: opErr } = await supabaseAdmin.from('operators')
            .insert(operators.map((op: Record<string, unknown>) => ({ ...op, owned_gen_id: genRow!.id, is_mock: true })));
          if (opErr) throw opErr;
        }
      }
    }

    // 4) Faults
    const FAULTS = [
      { g_id: 'G-0482', location: 'الرمادي - الأندلس', type: 'انقطاع الاتصال', severity: 'critical', time_label: 'منذ 2 د', icon: 'WifiOff', is_mock: true },
      { g_id: 'G-1204', location: 'الرمادي - المعارف', type: 'إفراط في الحرارة', severity: 'critical', time_label: 'منذ 5 د', icon: 'Thermometer', is_mock: true },
      { g_id: 'G-2891', location: 'الرمادي - التميم', type: 'تذبذب في الجهد', severity: 'warning', time_label: 'منذ 12 د', icon: 'Zap', is_mock: true },
      { g_id: 'G-0071', location: 'الرمادي - الكرامة', type: 'انقطاع الاتصال', severity: 'warning', time_label: 'منذ 18 د', icon: 'WifiOff', is_mock: true },
      { g_id: 'G-1563', location: 'الرمادي - النهضة', type: 'صيانة مجدولة', severity: 'info', time_label: 'منذ 25 د', icon: 'RefreshCw', is_mock: true },
      { g_id: 'G-0930', location: 'الرمادي - الحوز', type: 'انخفاض الوقود', severity: 'warning', time_label: 'منذ 31 د', icon: 'AlertTriangle', is_mock: true },
      { g_id: 'G-2240', location: 'الرمادي - الجزيرة', type: 'تذبذب في الجهد', severity: 'warning', time_label: 'منذ 45 د', icon: 'Zap', is_mock: true },
    ];
    const { error: fe } = await supabaseAdmin.from('faults').insert(FAULTS);
    if (fe) throw fe;

    // 5) Notifications
    const NOTIFS = [
      { type: 'fault', title: 'عطل حرج — مولد G-0482', body: 'انقطاع الاتصال المفاجئ في حي الأندلس. آخر قراءة: 320 KW', time_label: 'منذ 2 د', read: false, is_mock: true },
      { type: 'fault', title: 'إفراط في الحرارة — G-1204', body: 'درجة حرارة المولد وصلت 95°C في حي المعارف', time_label: 'منذ 5 د', read: false, is_mock: true },
      { type: 'warning', title: 'تذبذب في الجهد — G-2891', body: 'تقلبات متكررة في الجهد بين 200–240V في حي التميم', time_label: 'منذ 12 د', read: false, is_mock: true },
      { type: 'warning', title: 'انخفاض الوقود — G-0930', body: 'مستوى الوقود أقل من 15% في حي الكرامة', time_label: 'منذ 18 د', read: true, is_mock: true },
      { type: 'info', title: 'صيانة مجدولة — G-1563', body: 'موعد الصيانة الدورية خلال 48 ساعة في حي النهضة', time_label: 'منذ 25 د', read: true, is_mock: true },
      { type: 'success', title: 'تم استعادة المولد — G-0310', body: 'عاد المولد إلى العمل بعد الصيانة. الطاقة: 420 KW', time_label: 'منذ 34 د', read: true, is_mock: true },
      { type: 'warning', title: 'عطل في الحساس — G-2240', body: 'قراءات غير طبيعية من حساس الجهد في حي الجزيرة', time_label: 'منذ 45 د', read: true, is_mock: true },
      { type: 'info', title: 'تحديث البرنامج الثابت', body: 'يتوفر تحديث جديد v2.0.27 لوحدات التحكم. الرجاء المراجعة', time_label: 'منذ 1 س', read: true, is_mock: true },
      { type: 'success', title: 'اكتمال الربط بالشبكة', body: '12 مولد جديد تم ربطه بالشبكة الوطنية في حي الحوز', time_label: 'منذ 2 س', read: true, is_mock: true },
      { type: 'fault', title: 'انقطاع كامل — منطقة الحوز', body: '8 مولدات خرجت عن الخدمة في وقت واحد. فريق الطوارئ مُبلَّغ', time_label: 'منذ 3 س', read: true, is_mock: true },
    ];
    const { error: ne } = await supabaseAdmin.from('notifications').insert(NOTIFS);
    if (ne) throw ne;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
