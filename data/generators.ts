export type GeneratorStatus = 'online-grid' | 'online-gen' | 'fault' | 'offline';

export interface Generator {
  id: number;
  lat: number;
  lng: number;
  status: GeneratorStatus;
  power: number;   // KW
  area: string;
  city: string;
  hours: number;   // total operating hours
  voltage?: number; // last known voltage
}

/** Deterministic LCG — same sequence on server & client (no hydration mismatch) */
function lcg(seed: number) {
  let n = seed;
  return () => {
    n = (n * 9301 + 49297) % 233280;
    return n / 233280;
  };
}

export const ANBAR_CITIES = [
  {
    city: 'الرمادي',
    areas: [
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
    ],
    count: 1200,
  },
  {
    city: 'الفلوجة',
    areas: [
      { name: 'مركز الفلوجة', lat: 33.3530, lng: 43.7855 },
      { name: 'الجولان',      lat: 33.3600, lng: 43.7700 },
      { name: 'حي العدل',     lat: 33.3450, lng: 43.7950 },
      { name: 'الشهداء',      lat: 33.3700, lng: 43.8000 },
      { name: 'النازل',       lat: 33.3400, lng: 43.7800 },
      { name: 'الحسين',       lat: 33.3580, lng: 43.8100 },
    ],
    count: 700,
  },
  {
    city: 'هيت',
    areas: [
      { name: 'مركز هيت',  lat: 33.6422, lng: 42.8270 },
      { name: 'الحي الغربي', lat: 33.6380, lng: 42.8150 },
      { name: 'الشرقية',   lat: 33.6480, lng: 42.8350 },
    ],
    count: 400,
  },
  {
    city: 'عانة',
    areas: [
      { name: 'مركز عانة', lat: 34.4639, lng: 41.9950 },
      { name: 'الريف',     lat: 34.4700, lng: 41.9800 },
    ],
    count: 250,
  },
  {
    city: 'القائم',
    areas: [
      { name: 'مركز القائم', lat: 34.3783, lng: 41.1158 },
      { name: 'الكرابلة',    lat: 34.3700, lng: 41.1050 },
      { name: 'حسيبة',      lat: 34.3850, lng: 41.1300 },
    ],
    count: 250,
  },
  {
    city: 'الرطبة',
    areas: [
      { name: 'مركز الرطبة', lat: 33.5578, lng: 40.2873 },
    ],
    count: 100,
  },
  {
    city: 'عكاشات',
    areas: [
      { name: 'مركز عكاشات', lat: 33.7428, lng: 42.1444 },
    ],
    count: 100,
  },
];

// Legacy flat list for backward compat
export const RAMADI_AREAS = ANBAR_CITIES[0].areas;

/** Status weight table: 40% grid, 30% gen, 20% fault, 10% offline */
const WEIGHTS: GeneratorStatus[] = [
  'online-grid','online-grid','online-grid','online-grid',
  'online-gen', 'online-gen', 'online-gen',
  'fault',      'fault',
  'offline',
];

const FAULT_TYPES = [
  'انقطاع الاتصال',
  'إفراط في الحرارة',
  'تذبذب في الجهد',
  'انخفاض الوقود',
  'عطل في الحساس',
  'قطع التيار',
];

const rng = lcg(42);

// Build 3000 generators spread across all Anbar cities
let _id = 0;
export const GENERATORS: Generator[] = ANBAR_CITIES.flatMap(({ city, areas, count }) =>
  Array.from({ length: count }, () => {
    const area = areas[Math.floor(rng() * areas.length)];
    const status = WEIGHTS[Math.floor(rng() * WEIGHTS.length)];
    const baseV = status === 'online-grid' ? 220 + (rng() - 0.5) * 20
                : status === 'online-gen'  ? 215 + (rng() - 0.5) * 25
                : status === 'fault'       ? 160 + rng() * 40
                :                            0;
    _id++;
    return {
      id: _id,
      lat: area.lat + (rng() - 0.5) * 0.06,
      lng: area.lng + (rng() - 0.5) * 0.06,
      status,
      power: Math.round((rng() * 450 + 50) * 10) / 10,
      area: area.name,
      city,
      hours: Math.floor(rng() * 8760),
      voltage: status === 'offline' ? 0 : Math.round(baseV * 10) / 10,
    };
  })
);

export const STATUS_LABEL: Record<GeneratorStatus, string> = {
  'online-grid': 'شبكة وطنية',
  'online-gen':  'مولد نشط',
  'fault':       'عطل',
  'offline':     'غير متصل',
};

export const STATUS_COLOR: Record<GeneratorStatus, string> = {
  'online-grid': '#10b981',
  'online-gen':  '#3b82f6',
  'fault':       '#f97316',
  'offline':     '#ef4444',
};

export const STATUS_BG: Record<GeneratorStatus, string> = {
  'online-grid': 'rgba(16,185,129,0.12)',
  'online-gen':  'rgba(59,130,246,0.12)',
  'fault':       'rgba(249,115,22,0.12)',
  'offline':     'rgba(239,68,68,0.12)',
};

export function getFaultType(id: number) {
  return FAULT_TYPES[id % FAULT_TYPES.length];
}
