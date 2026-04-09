'use client';

import { motion } from 'framer-motion';
import { Cpu, BadgeDollarSign, BellElectric, Smartphone } from 'lucide-react';

// ─── Feature card data ──────────────────────────────────────────────────────
const FEATURES = [
  {
    id: 'iot',
    icon: Cpu,
    accentFrom: '#10b981',
    accentTo:   '#06b6d4',
    glowColor:  'rgba(16,185,129,0.18)',
    title:      'المراقبة اللحظية عبر إنترنت الأشياء',
    titleEn:    'Real-time IoT Monitoring',
    body:       'معالجة ملايين القراءات اللحظية عبر خوادم ThingsBoard لضمان استقرار الشبكة وتقييم الأداء على مدار الساعة.',
    tag:        'ThingsBoard · MQTT',
    colSpan:    'lg:col-span-2',
  },
  {
    id: 'billing',
    icon: BadgeDollarSign,
    accentFrom: '#a855f7',
    accentTo:   '#6366f1',
    glowColor:  'rgba(168,85,247,0.18)',
    title:      'العدالة الآلية في التسعيرة',
    titleEn:    'Automated & Fair Billing',
    body:       'احتساب دقيق للتسعيرة الرسمية وإصدار كشوفات غير قابلة للتلاعب بناءً على ساعات التشغيل الفعلية.',
    tag:        'Supabase · Edge Functions',
    colSpan:    'lg:col-span-1',
  },
  {
    id: 'faults',
    icon: BellElectric,
    accentFrom: '#f59e0b',
    accentTo:   '#ef4444',
    glowColor:  'rgba(245,158,11,0.18)',
    title:      'كشف الأعطال المبكر',
    titleEn:    'Instant Fault Detection',
    body:       'رصد الانقطاعات وتذبذب الفولتية وتوجيه إشعارات فورية لغرف العمليات وفرق الصيانة.',
    tag:        'Rule Engine · Alerts',
    colSpan:    'lg:col-span-1',
  },
  {
    id: 'pwa',
    icon: Smartphone,
    accentFrom: '#3b82f6',
    accentTo:   '#06b6d4',
    glowColor:  'rgba(59,130,246,0.18)',
    title:      'تطبيق ويب تقدمي',
    titleEn:    'PWA Ready',
    body:       'وصول سريع وسلس للمشغلين والمواطنين عبر تطبيق يعمل كبرنامج أساسي في الهاتف حتى مع ضعف الاتصال بالإنترنت.',
    tag:        'Offline · Installable',
    colSpan:    'lg:col-span-2',
  },
] as const;

// ─── Animation variants ─────────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

// ─── Individual Feature Card ────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  accentFrom,
  accentTo,
  glowColor,
  title,
  titleEn,
  body,
  tag,
  colSpan,
}: (typeof FEATURES)[number]) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -6, scale: 1.018 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={`group relative flex flex-col gap-5 rounded-3xl p-7 border overflow-hidden cursor-default select-none ${colSpan}`}
      style={{
        background:  'rgba(255,255,255,0.035)',
        borderColor: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
    >
      {/* Radial glow — appears on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
        style={{
          background: `radial-gradient(420px circle at 30% 40%, ${glowColor}, transparent 70%)`,
        }}
      />

      {/* Gradient icon badge */}
      <div
        className="relative w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
        style={{ background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})` }}
      >
        <Icon className="w-6 h-6 text-white" strokeWidth={1.8} />
      </div>

      {/* Text content */}
      <div className="relative flex flex-col gap-2 flex-1">
        <h3
          className="text-lg font-bold leading-snug"
          style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}
        >
          {title}
        </h3>
        <p
          className="text-xs font-medium tracking-wide uppercase"
          style={{ color: accentFrom }}
        >
          {titleEn}
        </p>
        <p
          className="text-sm leading-relaxed mt-1"
          style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}
        >
          {body}
        </p>
      </div>

      {/* Tag pill */}
      <div className="relative self-start">
        <span
          className="text-[11px] font-mono px-3 py-1 rounded-full border"
          style={{
            color:       accentFrom,
            borderColor: `${accentFrom}33`,
            background:  `${accentFrom}12`,
          }}
        >
          {tag}
        </span>
      </div>

      {/* Subtle animated border shimmer */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          background: `linear-gradient(135deg, ${accentFrom}22, transparent 50%, ${accentTo}22)`,
        }}
      />
    </motion.div>
  );
}

// ─── Main Section Export ────────────────────────────────────────────────────
export default function FeaturesSection() {
  return (
    <section
      dir="rtl"
      className="relative w-full py-20 px-6 overflow-hidden"
      style={{ background: 'var(--background)' }}
    >
      {/* Background decorative blobs */}
      <div
        className="pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.4), transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-15 blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.4), transparent 70%)' }}
      />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14 space-y-3"
        >
          {/* Pill badge */}
          <span
            className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-2"
            style={{
              color:       'var(--primary)',
              borderColor: 'rgba(16,185,129,0.3)',
              background:  'rgba(16,185,129,0.08)',
            }}
          >
            SPGMS · v2.0 — ThingsBoard Integration
          </span>

          <h2
            className="text-3xl lg:text-4xl font-bold tracking-tight"
            style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}
          >
            مميزات النظام
          </h2>
          <p
            className="text-base max-w-xl mx-auto leading-relaxed"
            style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}
          >
            منظومة متكاملة تربط بنية بيانات إنترنت الأشياء بلوحات تحكم ذكية لإدارة 3,000 مولد كهربائي في محافظة الأنبار
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-emerald-500/50" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-emerald-500/50" />
          </div>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {FEATURES.map((feat) => (
            <FeatureCard key={feat.id} {...feat} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
