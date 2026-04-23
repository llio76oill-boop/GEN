import { Zap, WrenchIcon, Gauge, LayoutDashboard } from 'lucide-react';

interface Entry {
  version: string;
  date: string;
  title: string;
  items: { type: 'feature' | 'fix' | 'perf' | 'enhance'; text: string }[];
}

const CHANGELOG: Entry[] = [
  {
    version: 'v2.3.0', date: 'أبريل 2026',
    title: 'لوحة القياسات الديناميكية — تعيين الحقول الحية',
    items: [
      { type: 'feature', text: 'عمود JSONB جديد: fields_map — يخزن تعيين حقول قناة البيانات (field1→voltage…)' },
      { type: 'enhance', text: 'Edge Function محدَّثة: تستخرج field1…field8 من القناة وتحفظها في JSONB' },
      { type: 'feature', text: 'مكوّن DynamicTelemetryDashboard: يعرض widgets مختلفة تلقائياً حسب نوع الحقل' },
      { type: 'feature', text: 'Voltage: مقياس نصف دائري (0–300V) أحمر تحت 180V، أخضر في المدى الطبيعي' },
      { type: 'feature', text: 'Current: مخطط Sparkline خطي مع إشارة الاتجاه (+/−)' },
      { type: 'feature', text: 'Power: بطاقة KPI كبيرة مع شريط توهج وعرض الكيلوواط' },
      { type: 'enhance', text: 'تحديث تلقائي كل 15 ثانية مع زر تحديث يدوي' },
    ],
  },
  {
    version: 'v2.2.0', date: 'أبريل 2026',
    title: 'اكتشاف القنوات التلقائي — مزامنة الأجهزة',
    items: [
      { type: 'feature', text: 'Supabase Edge Function جديدة: sync-channels — تجلب كل القنوات بـ User API Key وتزامنها مع owned_generators' },
      { type: 'feature', text: 'منطق upsert: INSERT للقنوات الجديدة، UPDATE للقنوات الموجودة (الاسم + read key)' },
      { type: 'feature', text: 'استخراج تلقائي لـ Read API Key من مصفوفة api_keys في استجابة القناة' },
      { type: 'feature', text: 'زر "مزامنة الأجهزة" في صفحة المولدات مع حالات تحميل وإشعار toast' },
      { type: 'enhance', text: 'USER_API_KEY محفوظ في Secrets — لا يُكشف أبداً في الواجهة الأمامية' },
    ],
  },
  {
    version: 'v2.1.0', date: 'أبريل 2026',
    title: 'غرفة التحكم الكاملة + مركز المشتركين',
    items: [
      { type: 'feature', text: 'قراءة حالة المولد مباشرةً من القناة الحية (جهد حي كل 30 ثانية) — لا تشغيل يدوي' },
      { type: 'feature', text: 'مركز المشتركين: تسجيل جديد، بطاقة رقمية QR، مشاركة واتساب بمعلومات الاشتراك' },
      { type: 'feature', text: 'إضافة مشغلين بالمناوبات من غرفة التحكم مباشرة' },
      { type: 'feature', text: 'تصدير المشتركين CSV + شريط حالة مباشر (ساعات التشغيل، المشغلون، القناة)' },
      { type: 'enhance', text: 'بطاقات المشتركين: شريط حالة ملون، avatar، أزرار اتصال/واتساب/بطاقة' },
      { type: 'feature', text: 'شريط تنقل الجوال: 4 تبويبات رئيسية + درج "المزيد" يعرض جميع الأقسام (شبكة 3 أعمدة)' },
      { type: 'fix',     text: 'إصلاح خطأ hydration — button داخل button في صفحة أصحاب المولدات' },
    ],
  },
  {
    version: 'v2.0.30', date: 'أبريل 2026',
    title: 'ربط البيانات الحقيقية وإصلاحات البنية',
    items: [
      { type: 'feature', text: 'صفحة أصحاب المولدات: جلب مباشر من Supabase مع لوحة فواتير المشتركين' },
      { type: 'fix',     text: 'generateStaticParams غير متزامن لصفحات ملفات المولدات' },
      { type: 'fix',     text: 'فلتر is_mock=false في مركز بيانات ThingsBoard + مفتاح React صحيح' },
      { type: 'feature', text: 'زر "عرض الملف" مع التنقل لصفحة تفصيلية لكل مولد' },
    ],
  },
  {
    version: 'v2.0.27', date: 'أبريل 2026',
    title: 'ربط بيانات المشتركين الحقيقيين',
    items: [
      { type: 'feature', text: 'خريطة تفاعلية حقيقية مع موقع مدينة الرمادي — الأنبار' },
      { type: 'feature', text: 'صفحات مخصصة لإدارة الأعطال والمولدات والتحليلات' },
      { type: 'enhance', text: 'نظام التخطيط المتداخل باستخدام Next.js App Router Layouts' },
      { type: 'perf',    text: 'بيانات مولدات محددة مسبقاً بالبذرة (seeded) لتجنب اختلاف SSR/CSR' },
    ],
  },
  {
    version: 'v2.0.26', date: 'أبريل 2026',
    title: 'تكامل Leaflet للخرائط التفاعلية',
    items: [
      { type: 'feature', text: 'استخدام react-leaflet مع خرائط CartoDB Dark Matter' },
      { type: 'feature', text: 'عرض 300 نقطة مولد على الخريطة بألوان مرمّزة حسب الحالة' },
      { type: 'fix',     text: 'إصلاح مشكلة الهيدريشن من خلال التحميل الديناميكي (ssr: false)' },
    ],
  },
  {
    version: 'v2.0.25', date: 'مارس 2026',
    title: 'نظام اكتشاف الأعطال الفوري',
    items: [
      { type: 'feature', text: 'واجهة إدارة الأعطال مع أولويات وأنواع العطل' },
      { type: 'feature', text: 'تحديث حي العيش في الوقت الحقيقي عبر Supabase Realtime' },
      { type: 'enhance', text: 'تحسين تصميم بطاقة FaultFeed بالإشعارات المتحركة' },
    ],
  },
  {
    version: 'v2.0.24', date: 'فبراير 2026',
    title: 'دعم RTL والعربية الكاملة',
    items: [
      { type: 'feature', text: 'دعم كامل للغة العربية وخط IBM Plex Sans Arabic' },
      { type: 'enhance', text: 'تخطيط RTL من الجذر باستخدام dir="rtl" على عنصر html' },
      { type: 'fix',     text: 'إصلاح محاذاة الشريط الجانبي والأيقونات في وضع RTL' },
    ],
  },
  {
    version: 'v2.0.23', date: 'يناير 2026',
    title: 'نظام KPI المتحرك',
    items: [
      { type: 'feature', text: 'مؤشرات KPI مع Bento Grid وانيميشن Framer Motion' },
      { type: 'feature', text: 'مخططات خط صغيرة (Sparkline) لتتبع الاتجاهات' },
      { type: 'feature', text: 'مقياس نصف الدائرة (Arc Gauge) لنسبة التشغيل' },
    ],
  },
  {
    version: 'v2.0.22', date: 'ديسمبر 2025',
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
        <h1 className="text-xl font-bold text-[var(--text-1)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
          سجل التحديثات
        </h1>
        <p className="text-sm text-[var(--text-4)] mt-0.5" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
          نظام إدارة الشبكة الكهربائية الذكية — S.G.M
        </p>
      </div>

      {/* System info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { Icon: LayoutDashboard, label: 'الإصدار',     value: 'v2.3.0'   },
          { Icon: Zap,             label: 'المولدات',    value: '3,000'    },
          { Icon: Gauge,           label: 'نسبة التشغيل', value: '87.3%'  },
          { Icon: WrenchIcon,      label: 'الأعطال',      value: '62 نشط'  },
        ].map(({ Icon, label, value }) => (
          <div
            key={label}
            className="glass-card p-3 flex flex-col items-center text-center gap-1"
          >
            <Icon className="w-5 h-5 text-emerald-400 mb-1" />
            <p className="text-base font-bold text-[var(--text-1)]">{value}</p>
            <p className="text-[10px] text-[var(--text-5)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{label}</p>
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
                    <h3 className="text-sm font-semibold text-[var(--text-1)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                      {entry.title}
                    </h3>
                  </div>
                  <span className="text-[10px] text-[var(--text-5)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
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
                        <p className="text-xs text-[var(--text-3)] leading-relaxed" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
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
