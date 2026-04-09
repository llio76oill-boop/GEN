'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowRight, MapPin, User, Phone, FileText, Fuel,
  Zap, Clock, Wifi, WifiOff, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Minus, RefreshCw, Activity,
  Shield, Hash, Calendar, BarChart3,
} from 'lucide-react';
import { useGeneratorData, type GeneratorProfile } from '@/hooks/useGeneratorData';

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  'online-grid': { label: 'شبكة وطنية',  color: '#10b981', bg: 'rgba(16,185,129,0.12)',  pulse: true  },
  'online-gen':  { label: 'مولد نشط',    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   pulse: true  },
  'fault':       { label: 'عطل',          color: '#f97316', bg: 'rgba(249,115,22,0.12)',   pulse: false },
  'offline':     { label: 'غير متصل',    color: '#6b7280', bg: 'rgba(107,114,128,0.12)',  pulse: false },
};

function voltageClass(v: number): { label: string; color: string; bg: string; icon: React.ElementType } {
  if (v < 180)  return { label: 'منخفض جداً', color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   icon: AlertTriangle  };
  if (v < 210)  return { label: 'منخفض',       color: '#f97316', bg: 'rgba(249,115,22,0.15)',  icon: TrendingDown   };
  if (v <= 240) return { label: 'طبيعي',        color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: CheckCircle2   };
  if (v <= 260) return { label: 'مرتفع',        color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: TrendingUp     };
  return              { label: 'مرتفع جداً', color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   icon: AlertTriangle  };
}

// ─── Skeleton ───────────────────────────────────────────────────────────────────
function Skel({ className }: { className: string }) {
  return (
    <motion.div
      className={`rounded-xl ${className}`}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  );
}

function SkeletonGrid() {
  return (
    <div className="space-y-5 max-w-5xl">
      <div className="glass-card p-5 flex items-center gap-4">
        <Skel className="w-14 h-14 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skel className="h-5 w-40" />
          <Skel className="h-3 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Skel className="h-72 lg:col-span-1" />
        <Skel className="h-72 lg:col-span-2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <Skel key={i} className="h-24" />)}
      </div>
    </div>
  );
}

// ─── Animated number ────────────────────────────────────────────────────────────
function AnimNum({ to, decimals = 0 }: { to: number; decimals?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    const raf = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setV(ease * to);
      if (p < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [to]);
  return <>{v.toFixed(decimals)}</>;
}

// ─── Info row ──────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, color = 'var(--text-3)' }: {
  icon: React.ElementType; label: string; value: string; color?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0"
         style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
           style={{ background: `${color}18` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>{label}</p>
        <p className="text-sm font-medium break-words" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>{value}</p>
      </div>
    </div>
  );
}

// ─── Mini KPI ─────────────────────────────────────────────────────────────────
function MiniKpi({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-[10px]" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>{value}</p>
    </div>
  );
}

// ─── Voltage area chart ────────────────────────────────────────────────────────
function VoltageAreaChart({ feeds, color }: { feeds: { entry: number; value: number }[]; color: string }) {
  if (feeds.length < 2) return null;
  const values = feeds.map(f => f.value);
  const min = Math.min(...values, 190) - 10;
  const max = Math.max(...values, 250) + 10;
  const range = max - min;
  const W = 400, H = 100;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: H - ((v - min) / range) * H,
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const fill = `${line} L ${W} ${H} L 0 ${H} Z`;
  const yLine = (v: number) => ((H - ((v - min) / range) * H)).toFixed(1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="vchart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      {/* Safe zone band */}
      <rect x="0" y={yLine(210)} width={W} height={parseFloat(yLine(240)) - parseFloat(yLine(210))}
            fill="rgba(16,185,129,0.06)" />
      {/* 210V line */}
      <line x1="0" y1={yLine(210)} x2={W} y2={yLine(210)}
            stroke="#10b981" strokeWidth="0.8" strokeDasharray="4,3" strokeOpacity="0.5" />
      {/* 240V line */}
      <line x1="0" y1={yLine(240)} x2={W} y2={yLine(240)}
            stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="4,3" strokeOpacity="0.5" />
      <path d={fill} fill="url(#vchart-fill)" />
      <motion.path
        d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function GeneratorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const genId  = typeof params?.id === 'string' ? params.id : '';

  const { profile: p, tsData, loadingProfile, loadingTs, errorProfile, errorTs, refetchTs } =
    useGeneratorData(genId);

  const feeds = (tsData?.feeds ?? [])
    .map(f => ({ entry: f.entry_id, time: f.created_at, value: parseFloat(f.field1 ?? '0') }))
    .filter(f => f.value > 0);

  const latestVoltage = feeds.at(-1)?.value ?? null;
  const voltCfg       = latestVoltage !== null ? voltageClass(latestVoltage) : null;
  const trend         = feeds.length >= 2 ? (feeds.at(-1)!.value - feeds.at(-2)!.value) : 0;

  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);
  useEffect(() => {
    const lastTime = feeds.at(-1)?.time;
    if (!lastTime) { setSecondsAgo(null); return; }
    const update = () => setSecondsAgo(Math.floor((Date.now() - new Date(lastTime).getTime()) / 1000));
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tsData]);

  if (loadingProfile) return <SkeletonGrid />;

  if (errorProfile || !p) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <WifiOff className="w-12 h-12 text-red-400" />
        <p className="text-base text-[var(--text-3)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
          {errorProfile ?? 'المولد غير موجود'}
        </p>
        <button onClick={() => router.back()} className="text-sm text-[var(--text-4)] underline"
                style={{ fontFamily: 'var(--font-ibm-arabic)' }}>رجوع</button>
      </div>
    );
  }

  const statusCfg = STATUS_CFG[p.status] ?? STATUS_CFG['offline'];
  const avgV = feeds.length > 0
    ? (feeds.reduce((s, f) => s + f.value, 0) / feeds.length).toFixed(2) + ' V'
    : '—';

  return (
    <div className="space-y-5 pb-6 max-w-5xl">

      {/* ── Header card ───────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-5 flex items-center gap-4 flex-wrap">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl font-bold"
             style={{ background: `${statusCfg.color}18`, border: `2px solid ${statusCfg.color}40`, color: statusCfg.color }}>
          {p.owner_initials}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap mb-1">
            <span className="text-xl font-bold text-[var(--text-1)]">{p.code}</span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}30`, fontFamily: 'var(--font-ibm-arabic)' }}>
              {statusCfg.pulse && <span className="w-1.5 h-1.5 rounded-full animate-pulse block" style={{ background: statusCfg.color }} />}
              {statusCfg.label}
            </span>
            {p.thingspeak_channel_id && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                    style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)' }}>
                CH #{p.thingspeak_channel_id}
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
            {p.area} — محافظة الأنبار&nbsp;&nbsp;•&nbsp;&nbsp;{p.power} كيلوواط&nbsp;&nbsp;•&nbsp;&nbsp;{p.total_hours.toLocaleString()} ساعة تشغيل
          </p>
        </div>
        {/* Back */}
        <button onClick={() => router.back()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                         color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
          رجوع
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </motion.div>

      {/* ── Row 1: Static info + Live telemetry ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Static info */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                    className="glass-card p-5 lg:col-span-1">
          <div className="flex items-center gap-2 mb-1 pb-3 border-b"
               style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <Shield className="w-4 h-4" style={{ color: '#6366f1' }} />
            <span className="text-sm font-semibold" style={{ color: '#6366f1', fontFamily: 'var(--font-ibm-arabic)' }}>
              المعلومات الرسمية
            </span>
          </div>
          <InfoRow icon={User}     label="صاحب المولد"          value={p.owner_name}  color="#a855f7" />
          <InfoRow icon={Phone}    label="رقم الهاتف"           value={p.owner_phone} />
          <InfoRow icon={Calendar} label="تاريخ التسجيل"        value={p.owned_since} />
          <InfoRow icon={MapPin}   label="الموقع الجغرافي"
                   value={p.address ?? p.area + ' — الرمادي'} color="#3b82f6" />
          <InfoRow icon={FileText} label="رقم الترخيص"
                   value={p.license_number ?? 'غير مُسجَّل'}  color="#f59e0b" />
          <InfoRow icon={Fuel}     label="الحصة الشهرية (لتر)"
                   value={p.monthly_fuel_quota ? p.monthly_fuel_quota.toLocaleString() + ' L' : 'غير محدد'} color="#10b981" />
        </motion.div>

        {/* Live telemetry */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                    className="glass-card p-5 lg:col-span-2 flex flex-col gap-4"
                    style={{ border: voltCfg ? `1px solid ${voltCfg.color}20` : undefined }}>
          {/* Telemetry header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: '#a855f7' }} />
              <span className="text-sm font-semibold" style={{ color: '#a855f7', fontFamily: 'var(--font-ibm-arabic)' }}>
                التلغراف الحي — ThingSpeak
              </span>
            </div>
            <button onClick={refetchTs} disabled={loadingTs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                    style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
                             color: '#a855f7', fontFamily: 'var(--font-ibm-arabic)' }}>
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTs ? 'animate-spin' : ''}`} />
              تحديث
            </button>
          </div>

          {/* No ThingSpeak */}
          {!p.thingspeak_channel_id && (
            <div className="flex-1 flex items-center justify-center py-10 rounded-xl"
                 style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
              <div className="text-center space-y-2">
                <WifiOff className="w-8 h-8 mx-auto" style={{ color: 'var(--text-5)' }} />
                <p className="text-sm" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                  لم يُربط بقناة ThingSpeak بعد
                </p>
              </div>
            </div>
          )}

          {/* Skeleton while loading */}
          {p.thingspeak_channel_id && loadingTs && !tsData && (
            <div className="space-y-3 flex-1">
              <Skel className="h-16 w-48" />
              <Skel className="h-28 w-full" />
            </div>
          )}

          {/* Error */}
          {errorTs && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                 style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-xs" style={{ color: '#ef4444', fontFamily: 'var(--font-ibm-arabic)' }}>
                خطأ في جلب البيانات: {errorTs}
              </p>
            </div>
          )}

          {/* Live data */}
          {latestVoltage !== null && voltCfg && (
            <div className="space-y-4">
              {/* Big voltage number */}
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <p className="text-[11px] mb-1 flex items-center gap-1.5"
                     style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    <Zap className="w-3 h-3" /> Field 1 — Voltage
                  </p>
                  <div className="flex items-end gap-2">
                    <p className="text-5xl font-bold tabular-nums" style={{ color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
                      <AnimNum to={latestVoltage} decimals={2} />
                    </p>
                    <span className="text-xl font-semibold mb-1.5" style={{ color: 'var(--text-4)' }}>V</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mb-1">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium w-fit"
                        style={{ background: voltCfg.bg, color: voltCfg.color,
                                 border: `1px solid ${voltCfg.color}40`, fontFamily: 'var(--font-ibm-arabic)' }}>
                    <voltCfg.icon className="w-3.5 h-3.5" />
                    {voltCfg.label}
                  </span>
                  {trend !== 0 && (
                    <span className="flex items-center gap-1 text-xs"
                          style={{ color: trend > 0 ? '#f97316' : '#10b981' }}>
                      {trend > 0
                        ? <TrendingUp className="w-3.5 h-3.5" />
                        : <TrendingDown className="w-3.5 h-3.5" />}
                      {trend > 0 ? '+' : ''}{trend.toFixed(2)} V
                    </span>
                  )}
                  {trend === 0 && feeds.length >= 2 && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-5)' }}>
                      <Minus className="w-3.5 h-3.5" />ثابت
                    </span>
                  )}
                </div>
                {secondsAgo !== null && (
                  <div className="mb-1 flex items-center gap-1.5 text-xs"
                       style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    <Clock className="w-3 h-3" />
                    منذ {secondsAgo < 60 ? `${secondsAgo}ث` : `${Math.floor(secondsAgo / 60)}د`}
                    &nbsp;•&nbsp; Entry #{feeds.at(-1)?.entry}
                  </div>
                )}
              </div>
              {/* Chart */}
              <div className="h-28">
                <VoltageAreaChart feeds={feeds} color={voltCfg.color} />
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 text-[10px]"
                   style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                <span className="flex items-center gap-1">
                  <span className="w-4 h-px block" style={{ borderTop: '1.5px dashed #10b981' }} />
                  210V — حد أدنى
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-4 h-px block" style={{ borderTop: '1.5px dashed #f59e0b' }} />
                  240V — حد أعلى
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Row 2: Mini KPI cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniKpi icon={Zap}       label="القدرة الكهربائية"         value={`${p.power} kW`}                color="#10b981" />
        <MiniKpi icon={Clock}     label="ساعات التشغيل"             value={p.total_hours.toLocaleString()} color="#6366f1" />
        <MiniKpi icon={BarChart3} label="متوسط الفولتية (آخر 32)"   value={avgV}                           color="#a855f7" />
        <MiniKpi icon={Hash}      label="إجمالي القراءات"           value={feeds.length}                   color="#0ea5e9" />
      </div>

      {/* ── Row 3: Readings table ─────────────────────────────────────────── */}
      <AnimatePresence>
        {feeds.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                      className="glass-card overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between border-b"
                 style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(168,85,247,0.04)' }}>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: '#a855f7' }} />
                <span className="text-sm font-semibold" style={{ color: '#a855f7', fontFamily: 'var(--font-ibm-arabic)' }}>
                  آخر القراءات
                </span>
              </div>
              <span className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                آخر {Math.min(feeds.length, 10)} قراءات
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                    {['رقم القراءة', 'الوقت', 'الفولتية (V)', 'الحالة'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-right text-xs font-medium"
                          style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...feeds].reverse().slice(0, 10).map((f, i) => {
                    const vc = voltageClass(f.value);
                    return (
                      <motion.tr key={f.entry}
                                 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                 transition={{ delay: i * 0.025 }}
                                 className="hover:bg-white/[0.02] transition-colors"
                                 style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--text-5)' }}>#{f.entry}</td>
                        <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--text-4)' }}>
                          {new Date(f.time).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-semibold" style={{ color: 'var(--text-1)' }}>
                          {f.value.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-[11px] px-2 py-0.5 rounded-full"
                                style={{ background: vc.bg, color: vc.color, fontFamily: 'var(--font-ibm-arabic)' }}>
                            {vc.label}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
