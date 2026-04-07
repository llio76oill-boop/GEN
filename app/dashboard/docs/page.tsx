import { Zap, WrenchIcon, Gauge, LayoutDashboard } from 'lucide-react';

interface Entry {
  version: string;
  date: string;
  title: string;
  items: { type: 'feature' | 'fix' | 'perf' | 'enhance'; text: string }[];
}

const CHANGELOG: Entry[] = [
  {
    version: 'v2.0.27', date: 'مايو ٢٠٢٦',
    title: 'التحديث الكامل للوحة التحكم',
    items: [
      { type: 'feature', text: 'خريطة تفاعلية حقيقية مع موقع مدينة الرمادي — الأنبار' },
      { type: 'feature', text: 'صفحات مخصصة لإدارة الأعطال والمولدات والتحليلات' },
      { type: 'enhance', text: 'نظام التخطيط المتداخل باستخدام Next.js App Router Layouts' },
      { type: 'perf',    text: 'بيانات مولدات محددة مسبقاً بالبذرة (seeded) لتجنب اختلاف SSR/CSR' },
    ],
  },
  {
    version: 'v2.0.26', date: 'أبريل ٢٠٢٦',
    title: 'تكامل Leaflet للخرائط التفاعلية',
    items: [
      { type: 'feature', text: 'استخدام react-leaflet مع خرائط CartoDB Dark Matter' },
      { type: 'feature', text: 'عرض 300 نقطة مولد على الخريطة بألوان مرمّزة حسب الحالة' },
      { type: 'fix',     text: 'إصلاح مشكلة الهيدريشن من خلال التحميل الديناميكي (ssr: false)' },
    ],
  },
  {
    version: 'v2.0.25', date: 'مارس ٢٠٢٦',
    title: 'نظام اكتشاف الأعطال الفوري',
    items: [
      { type: 'feature', text: 'واجهة إدارة الأعطال مع أولويات وأنواع العطل' },
      { type: 'feature', text: 'تحديث حي العيش في الوقت الحقيقي عبر Supabase Realtime' },
      { type: 'enhance', text: 'تحسين تصميم بطاقة FaultFeed بالإشعارات المتحركة' },
    ],
  },
  {
    version: 'v2.0.24', date: 'فبراير ٢٠٢٦',
    title: 'دعم RTL والعربية الكاملة',
    items: [
      { type: 'feature', text: 'دعم كامل للغة العربية وخط IBM Plex Sans Arabic' },
      { type: 'enhance', text: 'تخطيط RTL من الجذر باستخدام dir="rtl" على عنصر html' },
      { type: 'fix',     text: 'إصلاح محاذاة الشريط الجانبي والأيقونات في وضع RTL' },
    ],
  },
  {
    version: 'v2.0.23', date: 'يناير ٢٠٢٦',
    title: 'نظام KPI المتحرك',
    items: [
      { type: 'feature', text: 'مؤشرات KPI مع Bento Grid وانيميشن Framer Motion' },
      { type: 'feature', text: 'مخططات خط صغيرة (Sparkline) لتتبع الاتجاهات' },
      { type: 'feature', text: 'مقياس نصف الدائرة (Arc Gauge) لنسبة التشغيل' },
    ],
  },
  {
    version: 'v2.0.22', date: 'ديسمبر ٢٠٢٥',
    title: 'الإطلاق الأولي للنظام',
    items: [
      { type: 'feature', text: 'صفحة هبوط مع خلفية SVG متحركة وبوابات glassmorphism' },
      { type: 'feature', text: 'هيكل المشروع الأساسي: Next.js + Tailwind CSS v4 + TypeScript' },
      { type: 'feature', text: 'شريط جانبي قابل للطي مع 9 أقسام رئيسية' },
    ],
  },
];

const TYPE_CFG = {
  feature: { label: 'ميزة جديدة', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  fix:     { label: 'إصلاح',       color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
  perf:    { label: 'أداء',        color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  enhance: { label: 'تحسين',       color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
};

export default function DocsPage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
          سجل التحديثات
        </h1>
        <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
          نظام إدارة الشبكة الكهربائية الذكية — S.P.G.M.S
        </p>
      </div>

      {/* System info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { Icon: LayoutDashboard, label: 'الإصدار',     value: 'v2.0.27'  },
          { Icon: Zap,             label: 'المولدات',    value: '3,000'    },
          { Icon: Gauge,           label: 'نسبة التشغيل', value: '87.3%'  },
          { Icon: WrenchIcon,      label: 'الأعطال',      value: '62 نشط'  },
        ].map(({ Icon, label, value }) => (
          <div
            key={label}
            className="glass-card p-3 flex flex-col items-center text-center gap-1"
          >
            <Icon className="w-5 h-5 text-emerald-400 mb-1" />
            <p className="text-base font-bold text-white">{value}</p>
            <p className="text-[10px] text-gray-600" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative space-y-0">
        {CHANGELOG.map((entry, ei) => (
          <div key={entry.version} className="flex gap-4">
            {/* Timeline spine */}
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-bold z-10"
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}
              >
                {ei + 1}
              </div>
              {ei < CHANGELOG.length - 1 && (
                <div className="w-px flex-1 my-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
              )}
            </div>

            {/* Card */}
            <div className="flex-1 pb-5">
              <div className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-lg"
                      style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}
                    >
                      {entry.version}
                    </span>
                    <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                      {entry.title}
                    </h3>
                  </div>
                  <span className="text-[10px] text-gray-600" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                    {entry.date}
                  </span>
                </div>

                <ul className="space-y-1.5">
                  {entry.items.map((item, ii) => {
                    const cfg = TYPE_CFG[item.type];
                    return (
                      <li key={ii} className="flex items-start gap-2">
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                          style={{ background: cfg.bg, color: cfg.color, fontFamily: 'var(--font-ibm-arabic)' }}
                        >
                          {cfg.label}
                        </span>
                        <p className="text-xs text-gray-400 leading-relaxed" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                          {item.text}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
