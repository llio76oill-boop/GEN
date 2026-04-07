export type GeneratorStatus = 'online-grid' | 'online-gen' | 'fault' | 'offline';

export interface Generator {
  id: number;
  lat: number;
  lng: number;
  status: GeneratorStatus;
  power: number;   // KW
  area: string;
  hours: number;   // total operating hours
}

/** Deterministic LCG — same sequence on server & client (no hydration mismatch) */
function lcg(seed: number) {
  let n = seed;
  return () => {
    n = (n * 9301 + 49297) % 233280;
    return n / 233280;
  };
}

export const RAMADI_AREAS = [
  { name: 'المركز',       lat: 33.4258, lng: 43.2994 },
  { name: 'الأندلس',     lat: 33.4300, lng: 43.3200 },
  { name: 'المعارف',     lat: 33.4200, lng: 43.3100 },
  { name: 'التميم',      lat: 33.4150, lng: 43.2850 },
  { name: 'الحوز',       lat: 33.4400, lng: 43.2700 },
  { name: 'الجزيرة',    lat: 33.4550, lng: 43.3000 },
  { name: 'الكرامة',     lat: 33.4350, lng: 43.2500 },
  { name: 'الضباط',      lat: 33.4500, lng: 43.3400 },
  { name: 'البو فرج',    lat: 33.3850, lng: 43.3500 },
  { name: 'النهضة',      lat: 33.4200, lng: 43.3300 },
  { name: 'المرور',      lat: 33.4400, lng: 43.3050 },
  { name: 'الصناعية',   lat: 33.4000, lng: 43.3100 },
  { name: 'الوريج',      lat: 33.4600, lng: 43.2850 },
  { name: 'البوعيثة',   lat: 33.3950, lng: 43.2900 },
  { name: 'المنصور',     lat: 33.4100, lng: 43.2650 },
];

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

export const GENERATORS: Generator[] = Array.from({ length: 300 }, (_, i) => {
  const area = RAMADI_AREAS[Math.floor(rng() * RAMADI_AREAS.length)];
  return {
    id: i + 1,
    lat: area.lat + (rng() - 0.5) * 0.028,
    lng: area.lng + (rng() - 0.5) * 0.028,
    status: WEIGHTS[Math.floor(rng() * WEIGHTS.length)],
    power: Math.round((rng() * 450 + 50) * 10) / 10,
    area: area.name,
    hours: Math.floor(rng() * 8760),
  };
});

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
