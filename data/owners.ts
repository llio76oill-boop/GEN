import { GeneratorStatus } from './generators';

export interface Operator {
  id: number;
  name: string;
  phone: string;
  shift: 'صباحي' | 'مسائي' | 'ليلي';
  shiftStart: string;
  shiftEnd: string;
  active: boolean;
}

export interface OwnedGenerator {
  code: string;
  area: string;
  power: number;
  status: GeneratorStatus;
  totalHours: number;
  operators: Operator[];
}

export interface Owner {
  id: number;
  name: string;
  phone: string;
  initials: string;
  ownedSince: string;
  generators: OwnedGenerator[];
}

export const OWNERS: Owner[] = [
  {
    id: 1,
    name: 'أحمد محمد السامرائي',
    phone: '+964 790 123 4567',
    initials: 'أم',
    ownedSince: 'مارس 2023',
    generators: [
      {
        code: 'G-0042', area: 'المركز', power: 380, status: 'online-grid', totalHours: 6240,
        operators: [
          { id: 1,  name: 'كريم فهد حسن',     phone: '+964 770 111 0001', shift: 'صباحي', shiftStart: '06:00', shiftEnd: '14:00', active: true  },
          { id: 2,  name: 'ياسر علي محمود',   phone: '+964 780 111 0002', shift: 'مسائي', shiftStart: '14:00', shiftEnd: '22:00', active: false },
          { id: 3,  name: 'سامر خليل إبراهيم', phone: '+964 750 111 0003', shift: 'ليلي',  shiftStart: '22:00', shiftEnd: '06:00', active: false },
        ],
      },
      {
        code: 'G-0089', area: 'الأندلس', power: 210, status: 'online-gen', totalHours: 4800,
        operators: [
          { id: 4,  name: 'باسم حميد ناصر',   phone: '+964 790 222 0004', shift: 'صباحي', shiftStart: '06:00', shiftEnd: '14:00', active: true  },
          { id: 5,  name: 'رائد سعد عمر',     phone: '+964 770 222 0005', shift: 'مسائي', shiftStart: '14:00', shiftEnd: '22:00', active: false },
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'علي حسين الجبوري',
    phone: '+964 781 234 5678',
    initials: 'عح',
    ownedSince: 'يونيو 2022',
    generators: [
      {
        code: 'G-0156', area: 'الكرامة', power: 450, status: 'online-grid', totalHours: 7100,
        operators: [
          { id: 6,  name: 'حيدر عبد الله رضا', phone: '+964 790 333 0006', shift: 'صباحي', shiftStart: '06:00', shiftEnd: '14:00', active: true  },
          { id: 7,  name: 'مصطفى قاسم حسن',   phone: '+964 770 333 0007', shift: 'مسائي', shiftStart: '14:00', shiftEnd: '22:00', active: false },
          { id: 8,  name: 'أمير فلاح سليمان',  phone: '+964 780 333 0008', shift: 'ليلي',  shiftStart: '22:00', shiftEnd: '06:00', active: false },
        ],
      },
    ],
  },
  {
    id: 3,
    name: 'محمد عبد الرحمن الدليمي',
    phone: '+964 772 345 6789',
    initials: 'مع',
    ownedSince: 'يناير 2024',
    generators: [
      {
        code: 'G-0213', area: 'النهضة', power: 175, status: 'fault', totalHours: 2100,
        operators: [
          { id: 9,  name: 'طارق نزار فيصل',   phone: '+964 790 444 0009', shift: 'صباحي', shiftStart: '07:00', shiftEnd: '15:00', active: true  },
          { id: 10, name: 'أنس ماجد كريم',     phone: '+964 750 444 0010', shift: 'ليلي',  shiftStart: '23:00', shiftEnd: '07:00', active: false },
        ],
      },
      {
        code: 'G-0247', area: 'التميم', power: 320, status: 'online-gen', totalHours: 5500,
        operators: [
          { id: 11, name: 'عمر زيد الراوي',  phone: '+964 770 444 0011', shift: 'صباحي', shiftStart: '07:00', shiftEnd: '15:00', active: false },
          { id: 12, name: 'لؤي بلال عجيل',   phone: '+964 780 444 0012', shift: 'مسائي', shiftStart: '15:00', shiftEnd: '23:00', active: true  },
        ],
      },
      {
        code: 'G-0301', area: 'الحوز', power: 290, status: 'offline', totalHours: 1200,
        operators: [
          { id: 13, name: 'جمال ثائر شاكر',   phone: '+964 790 444 0013', shift: 'صباحي', shiftStart: '08:00', shiftEnd: '16:00', active: false },
        ],
      },
    ],
  },
  {
    id: 4,
    name: 'خالد إبراهيم الفهداوي',
    phone: '+964 783 456 7890',
    initials: 'خإ',
    ownedSince: 'سبتمبر 2023',
    generators: [
      {
        code: 'G-0078', area: 'الجزيرة', power: 500, status: 'online-grid', totalHours: 7800,
        operators: [
          { id: 14, name: 'عبد الكريم منصور',  phone: '+964 770 555 0014', shift: 'صباحي', shiftStart: '06:00', shiftEnd: '14:00', active: true  },
          { id: 15, name: 'أيمن ثامر نصير',    phone: '+964 780 555 0015', shift: 'مسائي', shiftStart: '14:00', shiftEnd: '22:00', active: false },
          { id: 16, name: 'زياد حارث مجيد',    phone: '+964 750 555 0016', shift: 'ليلي',  shiftStart: '22:00', shiftEnd: '06:00', active: false },
        ],
      },
      {
        code: 'G-0115', area: 'الضباط', power: 340, status: 'online-gen', totalHours: 6100,
        operators: [
          { id: 17, name: 'فراس نضال صالح',   phone: '+964 790 555 0017', shift: 'صباحي', shiftStart: '07:00', shiftEnd: '15:00', active: false },
          { id: 18, name: 'حسام علاء الدين',   phone: '+964 770 555 0018', shift: 'مسائي', shiftStart: '15:00', shiftEnd: '23:00', active: true  },
        ],
      },
    ],
  },
  {
    id: 5,
    name: 'سعد عمر البو فرجي',
    phone: '+964 784 567 8901',
    initials: 'سع',
    ownedSince: 'فبراير 2024',
    generators: [
      {
        code: 'G-0192', area: 'البو فرج', power: 155, status: 'online-gen', totalHours: 3400,
        operators: [
          { id: 19, name: 'نبيل جاسم حمود',   phone: '+964 790 666 0019', shift: 'صباحي', shiftStart: '07:00', shiftEnd: '15:00', active: true  },
          { id: 20, name: 'رشيد كامل عودة',   phone: '+964 780 666 0020', shift: 'ليلي',  shiftStart: '23:00', shiftEnd: '07:00', active: false },
        ],
      },
    ],
  },
  {
    id: 6,
    name: 'يوسف ناصر العبيدي',
    phone: '+964 785 678 9012',
    initials: 'ين',
    ownedSince: 'أبريل 2022',
    generators: [
      {
        code: 'G-0033', area: 'الوريج', power: 420, status: 'online-grid', totalHours: 7200,
        operators: [
          { id: 21, name: 'علاء حسن عباس',     phone: '+964 770 777 0021', shift: 'صباحي', shiftStart: '06:00', shiftEnd: '14:00', active: false },
          { id: 22, name: 'تحسين إياد ضياء',   phone: '+964 750 777 0022', shift: 'مسائي', shiftStart: '14:00', shiftEnd: '22:00', active: true  },
          { id: 23, name: 'أحمد بشير واثق',    phone: '+964 790 777 0023', shift: 'ليلي',  shiftStart: '22:00', shiftEnd: '06:00', active: false },
        ],
      },
      {
        code: 'G-0264', area: 'المنصور', power: 260, status: 'online-grid', totalHours: 5800,
        operators: [
          { id: 24, name: 'قصي لؤي محسن',     phone: '+964 780 777 0024', shift: 'صباحي', shiftStart: '07:00', shiftEnd: '15:00', active: true  },
          { id: 25, name: 'صادق وائل راضي',   phone: '+964 770 777 0025', shift: 'مسائي', shiftStart: '15:00', shiftEnd: '23:00', active: false },
        ],
      },
      {
        code: 'G-0298', area: 'البوعيثة', power: 145, status: 'fault', totalHours: 1800,
        operators: [
          { id: 26, name: 'حمزة رافد مؤيد',   phone: '+964 790 777 0026', shift: 'صباحي', shiftStart: '07:00', shiftEnd: '15:00', active: false },
        ],
      },
    ],
  },
];
