export interface LiveGeneratorData {
  device_id: string;
  gen_id: number;      // matches generators.id
  area: string;
  lat: number;
  lng: number;
  electrical: {
    current: number;
    energy_kwh_today: number;
    frequency_hz: number;
    power_kw: number;
    voltage: number;
  };
  generator: {
    battery_voltage: number;
    engine_temperature_c: number;
    fuel_level_percent: number;
    mode: string;
    running: boolean;
  };
  alerts: {
    high_temp: boolean;
    low_oil: boolean;
    overload: boolean;
  };
  signal: { wifi_rssi: number };
  timestamp: string;
}

// GEN-001..010 mapped to generators id 1..10 with updated Ramadi areas
export const LIVE_TELEMETRY: LiveGeneratorData[] = [
  { device_id:'GEN-001', gen_id:1,  area:'حي التأميم',      lat:33.4177, lng:43.2678, alerts:{high_temp:false,low_oil:false,overload:false}, electrical:{current:288.82,energy_kwh_today:0.941,frequency_hz:50,power_kw:64.25,voltage:222.47},  generator:{battery_voltage:12.6,engine_temperature_c:86.01,fuel_level_percent:90.83,mode:'auto',running:true},  signal:{wifi_rssi:-65}, timestamp:'2026-04-23T02:28:25.646407' },
  { device_id:'GEN-002', gen_id:2,  area:'حي الصوفية',      lat:33.4302, lng:43.2851, alerts:{high_temp:false,low_oil:false,overload:false}, electrical:{current:324.14,energy_kwh_today:1.019,frequency_hz:50,power_kw:72.99,voltage:225.17},  generator:{battery_voltage:12.6,engine_temperature_c:84.42,fuel_level_percent:91.87,mode:'auto',running:true},  signal:{wifi_rssi:-65}, timestamp:'2026-04-23T02:28:25.646407' },
  { device_id:'GEN-003', gen_id:3,  area:'حي الملعب',       lat:33.4220, lng:43.3052, alerts:{high_temp:false,low_oil:false,overload:false}, electrical:{current:324.49,energy_kwh_today:1.057,frequency_hz:50,power_kw:74.27,voltage:228.87},  generator:{battery_voltage:12.6,engine_temperature_c:90.90,fuel_level_percent:91.75,mode:'auto',running:true},  signal:{wifi_rssi:-65}, timestamp:'2026-04-23T02:28:25.646407' },
  { device_id:'GEN-004', gen_id:4,  area:'حي البكر',        lat:33.4355, lng:43.2948, alerts:{high_temp:false,low_oil:false,overload:false}, electrical:{current:308.61,energy_kwh_today:1.010,frequency_hz:50,power_kw:71.97,voltage:233.20},  generator:{battery_voltage:12.6,engine_temperature_c:86.95,fuel_level_percent:92.13,mode:'auto',running:true},  signal:{wifi_rssi:-65}, timestamp:'2026-04-23T02:28:25.646407' },
  { device_id:'GEN-005', gen_id:5,  area:'حي 8 شباط',      lat:33.4153, lng:43.2752, alerts:{high_temp:false,low_oil:false,overload:false}, electrical:{current:344.11,energy_kwh_today:1.074,frequency_hz:50,power_kw:80.49,voltage:233.90},  generator:{battery_voltage:12.6,engine_temperature_c:86.90,fuel_level_percent:91.72,mode:'auto',running:true},  signal:{wifi_rssi:-65}, timestamp:'2026-04-23T02:28:25.646407' },
  { device_id:'GEN-006', gen_id:6,  area:'حي الأندلس',      lat:33.4285, lng:43.3148, alerts:{high_temp:false,low_oil:false,overload:false}, electrical:{current:338.00,energy_kwh_today:1.079,frequency_hz:50,power_kw:75.27,voltage:222.68},  generator:{battery_voltage:12.6,engine_temperature_c:81.01,fuel_level_percent:91.89,mode:'auto',running:true},  signal:{wifi_rssi:-65}, timestamp:'2026-04-23T02:28:25.646407' },
  { device_id:'GEN-007', gen_id:7,  area:'حي العمال',       lat:33.4405, lng:43.2698, alerts:{high_temp:false,low_oil:false,overload:false}, electrical:{current:341.52,energy_kwh_today:1.049,frequency_hz:50,power_kw:76.77,voltage:224.79},  generator:{battery_voltage:12.6,engine_temperature_c:83.24,fuel_level_percent:91.93,mode:'auto',running:true},  signal:{wifi_rssi:-65}, timestamp:'2026-04-23T02:28:25.646407' },
  { device_id:'GEN-008', gen_id:8,  area:'حي ثلاثين تموز', lat:33.4183, lng:43.2833, alerts:{high_temp:false,low_oil:false,overload:false}, electrical:{current:332.64,energy_kwh_today:1.045,frequency_hz:50,power_kw:75.83,voltage:227.95},  generator:{battery_voltage:12.6,engine_temperature_c:88.49,fuel_level_percent:91.12,mode:'auto',running:true},  signal:{wifi_rssi:-65}, timestamp:'2026-04-23T02:28:25.646407' },
  { device_id:'GEN-009', gen_id:9,  area:'شارع عشرين',      lat:33.4325, lng:43.3002, alerts:{high_temp:false,low_oil:false,overload:false}, electrical:{current:350.47,energy_kwh_today:1.026,frequency_hz:50,power_kw:79.55,voltage:226.97},  generator:{battery_voltage:12.6,engine_temperature_c:94.76,fuel_level_percent:92.18,mode:'auto',running:true},  signal:{wifi_rssi:-65}, timestamp:'2026-04-23T02:28:25.646407' },
  { device_id:'GEN-010', gen_id:10, area:'حي المعلمين',     lat:33.4452, lng:43.2902, alerts:{high_temp:false,low_oil:false,overload:false}, electrical:{current:315.11,energy_kwh_today:0.983,frequency_hz:50,power_kw:72.21,voltage:229.15},  generator:{battery_voltage:12.6,engine_temperature_c:84.00,fuel_level_percent:91.95,mode:'auto',running:true},  signal:{wifi_rssi:-65}, timestamp:'2026-04-23T02:28:25.646407' },
];

// Quick lookup map by gen_id
export const TELEMETRY_BY_GEN_ID = new Map<number, LiveGeneratorData>(
  LIVE_TELEMETRY.map((t) => [t.gen_id, t])
);

