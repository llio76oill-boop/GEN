'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowRight, MapPin, User, Phone, FileText, Fuel,
  Zap, Clock, Wifi, WifiOff, AlertTriangle, CheckCircle2,
  Users, Wrench, BookOpen, Shield, Calendar,
  BarChart3, Search, Download, Activity, Droplets,
  Thermometer, Battery, RefreshCw, X,
} from 'lucide-react';
import { useGeneratorRecord } from '@/hooks/useGeneratorRecord';
import { TELEMETRY_BY_GEN_ID } from '@/data/live-telemetry';

// ─── Status config ──────────────────────────────────────────────────────────
const STATUS_CFG = {
  'online-grid': { label: 'شبكة وطنية', color: '#10b981', bg: 'rgba(16,185,129,0.12)', pulse: true  },
  'online-gen':  { label: 'مولد نشط',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  pulse: true  },
  'fault':       { label: 'عطل',         color: '#f97316', bg: 'rgba(249,115,22,0.12)',  pulse: false },
  'offline':     { label: 'غير متصل',   color: '#6b7280', bg: 'rgba(107,114,128,0.12)', pulse: false },
};

const EVENT_CFG = {
  start:       { label: 'تشغيل',  color: '#10b981', icon: Zap         },
  stop:        { label: 'إيقاف', color: '#6b7280', icon: WifiOff     },
  fault:       { label: 'عطل',   color: '#f97316', icon: AlertTriangle},
  refuel:      { label: 'وقود',  color: '#f59e0b', icon: Droplets    },
  maintenance: { label: 'صيانة', color: '#a78bfa', icon: Wrench      },
};

const SHIFT_CFG = {
  'صباحي': { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24' },
  'مسائي': { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6' },
  'ليلي':  { bg: 'rgba(168,85,247,0.12)', color: '#a855f7' },
};

// ─── Skeleton ───────────────────────────────────────────────────────────────
function Skel({ className }: { className: string }) {
  return (
    <motion.div className={`rounded-xl ${className}`}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      style={{ background: 'rgba(255,255,255,0.06)' }} />
  );
}

// ─── Info row ───────────────────────────────────────────────────────────────
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
        <p className="text-sm font-medium break-words" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>{value || '—'}</p>
      </div>
    </div>
  );
}

// ─── KPI card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: React.ElementType;
}) {
  return (
    <div className="glass-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-1)' }}>{value}</p>
      {sub && <p className="text-[10px]" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>{sub}</p>}
    </div>
  );
}

// ─── Tab button ─────────────────────────────────────────────────────────────
function Tab({ active, onClick, icon: Icon, label, badge }: {
  active: boolean; onClick: () => void; icon: React.ElementType; label: string; badge?: number | string;
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap"
      style={{
        background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
        color:      active ? '#a78bfa' : 'var(--text-4)',
        border:     active ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
        fontFamily: 'var(--font-ibm-arabic)',
      }}>
      <Icon className="w-3.5 h-3.5" />
      {label}
      {badge !== undefined && (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: active ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.08)', color: active ? '#a78bfa' : 'var(--text-5)' }}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Export CSV ─────────────────────────────────────────────────────────────
function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function GeneratorRecordPage() {
  const params = useParams();
  const router = useRouter();
  const rawId  = typeof params?.id === 'string' ? params.id : '';
  const genId  = /^\d+$/.test(rawId) ? parseInt(rawId, 10) : 0;

  const { record: r, operators, subscribers, logs, loading, error, refresh } =
    useGeneratorRecord(genId);

  const liveTele = TELEMETRY_BY_GEN_ID.get(genId) ?? null;

  type TabId = 'info' | 'operators' | 'subscribers' | 'logs' | 'stats' | 'live';
  const [tab, setTab] = useState<TabId>('info');

  // Log filters
  const today = new Date().toISOString().slice(0, 10);
  const [logFrom, setLogFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10);
  });
  const [logTo,    setLogTo]    = useState(today);
  const [logEvent, setLogEvent] = useState<string>('all');

  // Subscriber filters
  const [subSearch, setSubSearch] = useState('');
  const [subFilter, setSubFilter] = useState<'all' | 'residential' | 'commercial'>('all');

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const from = new Date(logFrom + 'T00:00:00');
    const to   = new Date(logTo   + 'T23:59:59');
    return logs.filter(l => {
      const d = new Date(l.logged_at);
      return d >= from && d <= to && (logEvent === 'all' || l.event === logEvent);
    });
  }, [logs, logFrom, logTo, logEvent]);

  // Filtered subscribers
  const filteredSubs = useMemo(() => {
    const q = subSearch.trim().toLowerCase();
    return subscribers.filter(s => {
      const matchType   = subFilter === 'all' || s.sub_type === subFilter;
      const matchSearch = !q || s.full_name.toLowerCase().includes(q) || (s.phone ?? '').includes(q);
      return matchType && matchSearch;
    });
  }, [subscribers, subSearch, subFilter]);

  // Stats
  const stats = useMemo(() => {
    const starts    = filteredLogs.filter(l => l.event === 'start').length;
    const stops     = filteredLogs.filter(l => l.event === 'stop').length;
    const fuelAdded = filteredLogs.filter(l => l.event === 'refuel').reduce((s, l) => s + (l.fuel_added || 0), 0);

    const sorted = [...logs].sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
    let runningHours = 0;
    let lastStart: Date | null = null;
    const from = new Date(logFrom + 'T00:00:00');
    const to   = new Date(logTo   + 'T23:59:59');
    for (const l of sorted) {
      const d = new Date(l.logged_at);
      if (l.event === 'start') { lastStart = d; }
      else if (l.event === 'stop' && lastStart) {
        const s = lastStart < from ? from : lastStart;
        const e = d > to ? to : d;
        if (e > s) runningHours += (e.getTime() - s.getTime()) / 3_600_000;
        lastStart = null;
      }
    }
    if (lastStart) {
      const s = lastStart < from ? from : lastStart;
      const e = to < new Date() ? to : new Date();
      if (e > s) runningHours += (e.getTime() - s.getTime()) / 3_600_000;
    }

    const activeSubs = subscribers.filter(s => s.active);
    const totalAmps  = activeSubs.reduce((s, sub) => s + sub.amps, 0);
    const monthlyRev = activeSubs.reduce((s, sub) => s + Number(sub.monthly_fee), 0);
    const capacity   = r?.capacity_amps ?? 0;
    const usedPct    = capacity > 0 ? Math.round((totalAmps / capacity) * 100) : 0;

    return { starts, stops, fuelAdded, runningHours, activeSubs: activeSubs.length,
             totalSubs: subscribers.length, totalAmps, monthlyRev, capacity, usedPct };
  }, [filteredLogs, logs, logFrom, logTo, subscribers, r]);

  if (loading) return (
    <div className="space-y-5 max-w-5xl">
      <Skel className="h-24 w-full" />
      <Skel className="h-12 w-96" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0,1,2,3].map(i => <Skel key={i} className="h-28" />)}</div>
      <Skel className="h-72 w-full" />
    </div>
  );

  if (error || !r) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <WifiOff className="w-12 h-12 text-red-400" />
      <p className="text-base" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
        {error ?? 'المولد غير موجود'}
      </p>
      <button onClick={() => router.back()} className="text-sm underline"
              style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>رجوع</button>
    </div>
  );

  const sc       = STATUS_CFG[r.status as keyof typeof STATUS_CFG] ?? STATUS_CFG['offline'];
  const code     = `GEN-${String(r.id).padStart(3, '0')}`;
  const initials = r.owner_name
    ? r.owner_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
    : code.slice(-3);

  return (
    <div className="space-y-5 pb-8 max-w-5xl" dir="rtl">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-5 flex items-center gap-4 flex-wrap">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg font-bold"
             style={{ background: `${sc.color}18`, border: `2px solid ${sc.color}40`, color: sc.color }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap mb-1">
            <span className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>{code}</span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}30`, fontFamily: 'var(--font-ibm-arabic)' }}>
              {sc.pulse && <span className="w-1.5 h-1.5 rounded-full animate-pulse block" style={{ background: sc.color }} />}
              {sc.label}
            </span>
            {liveTele && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-green-400 block" />
                {liveTele.electrical.voltage.toFixed(0)}V · {liveTele.electrical.power_kw}kW
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
            {r.area} — محافظة الأنبار&nbsp;&nbsp;•&nbsp;&nbsp;{r.power} كيلوواط&nbsp;&nbsp;•&nbsp;&nbsp;{r.hours.toLocaleString('ar-IQ')} ساعة
          </p>
          {r.owner_name && (
            <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
              <User className="w-3 h-3" />{r.owner_name}&nbsp;&nbsp;•&nbsp;&nbsp;<span style={{ direction: 'ltr' }}>{r.owner_phone}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-4)' }}>
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => router.back()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
            رجوع <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
                  className="glass-card p-2 flex items-center gap-1 overflow-x-auto">
        <Tab active={tab==='info'}        onClick={() => setTab('info')}        icon={Shield}    label="المعلومات" />
        <Tab active={tab==='operators'}   onClick={() => setTab('operators')}   icon={Wrench}    label="المشغلون"   badge={operators.length} />
        <Tab active={tab==='subscribers'} onClick={() => setTab('subscribers')} icon={Users}     label="المشتركون"  badge={subscribers.length} />
        <Tab active={tab==='logs'}        onClick={() => setTab('logs')}        icon={BookOpen}  label="سجل التشغيل" badge={logs.length} />
        <Tab active={tab==='stats'}       onClick={() => setTab('stats')}       icon={BarChart3} label="الإحصاءات" />
        <Tab active={tab==='live'}        onClick={() => setTab('live')}        icon={Activity}  label="قياسات حية" />
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

          {/* INFO */}
          {tab === 'info' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="glass-card p-5">
                  <p className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: '#6366f1', fontFamily: 'var(--font-ibm-arabic)' }}>
                    <User className="w-3.5 h-3.5" /> معلومات صاحب المولد
                  </p>
                  <InfoRow icon={User}     label="الاسم الكامل"    value={r.owner_name  ?? ''} color="#a855f7" />
                  <InfoRow icon={Phone}    label="رقم الهاتف"      value={r.owner_phone ?? ''} color="#3b82f6" />
                  <InfoRow icon={MapPin}   label="العنوان"          value={r.address     ?? ''} color="#10b981" />
                  <InfoRow icon={FileText} label="ملاحظات"          value={r.notes       ?? ''} color="#f59e0b" />
                </div>
                <div className="glass-card p-5">
                  <p className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: '#6366f1', fontFamily: 'var(--font-ibm-arabic)' }}>
                    <Zap className="w-3.5 h-3.5" /> مواصفات المولدة
                  </p>
                  <InfoRow icon={Zap}       label="القدرة الكهربائية"      value={`${r.power} kW`}                                          color="#10b981" />
                  <InfoRow icon={Activity}  label="السعة الكاملة (أمبير)" value={`${r.capacity_amps ?? 0} A`}                              color="#3b82f6" />
                  <InfoRow icon={Clock}     label="ساعات التشغيل الكلية"   value={`${r.hours.toLocaleString('ar-IQ')} ساعة`}              color="#6366f1" />
                  <InfoRow icon={Fuel}      label="حصة الوقود الشهرية"     value={`${(r.fuel_quota ?? 0).toLocaleString('ar-IQ')} لتر`}   color="#f59e0b" />
                  <InfoRow icon={BarChart3} label="سعر الأمبير الواحد"     value={`${Number(r.price_per_amp ?? 0).toLocaleString('ar-IQ')} د.ع`} color="#a855f7" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard label="المشتركون"         value={subscribers.length}                     color="#a855f7" icon={Users}    sub={`${subscribers.filter(s=>s.active).length} نشط`} />
                <KpiCard label="الأمبيرات المباعة" value={`${subscribers.filter(s=>s.active).reduce((s,sub)=>s+sub.amps,0)} A`} color="#3b82f6" icon={Zap} sub={`من ${r.capacity_amps ?? 0} A`} />
                <KpiCard label="الإيراد الشهري"    value={`${Math.round(subscribers.filter(s=>s.active).reduce((s,sub)=>s+Number(sub.monthly_fee),0)/1000)}k`} color="#10b981" icon={BarChart3} sub="دينار" />
                <KpiCard label="المشغلون"          value={operators.length}                       color="#f59e0b" icon={Wrench}   sub={`${operators.filter(o=>o.active).length} نشط`} />
              </div>
            </div>
          )}

          {/* OPERATORS */}
          {tab === 'operators' && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-3.5 flex items-center gap-2 border-b"
                   style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(167,139,250,0.04)' }}>
                <Wrench className="w-4 h-4" style={{ color: '#a78bfa' }} />
                <span className="text-sm font-semibold" style={{ color: '#a78bfa', fontFamily: 'var(--font-ibm-arabic)' }}>
                  المشغلون ({operators.length})
                </span>
              </div>
              {operators.length === 0 ? (
                <div className="py-16 text-center">
                  <Wrench className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--text-5)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>لا توجد بيانات مشغلين — شغّل seed-generator-records.js أولاً</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ direction: 'rtl' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                        {['الاسم','رقم الهاتف','المناوبة','الوقت','الحالة'].map(h => (
                          <th key={h} className="px-4 py-3 text-right text-[11px] font-semibold"
                              style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {operators.map((op, i) => {
                        const sfc = SHIFT_CFG[op.shift as keyof typeof SHIFT_CFG] ?? SHIFT_CFG['صباحي'];
                        return (
                          <tr key={op.id} style={{ borderBottom: i < operators.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>{op.name}</td>
                            <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-4)', direction: 'ltr' }}>{op.phone}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded-full text-[10px] font-semibold"
                                    style={{ background: sfc.bg, color: sfc.color, fontFamily: 'var(--font-ibm-arabic)' }}>{op.shift}</span>
                            </td>
                            <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-4)' }}>{op.shift_start} — {op.shift_end}</td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1 text-[10px]"
                                    style={{ color: op.active ? '#10b981' : '#6b7280', fontFamily: 'var(--font-ibm-arabic)' }}>
                                {op.active ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                {op.active ? 'نشط' : 'غير نشط'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUBSCRIBERS */}
          {tab === 'subscribers' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard label="إجمالي المشتركين"  value={subscribers.length}                                                color="#a855f7" icon={Users} />
                <KpiCard label="الأمبيرات الكلية"  value={`${subscribers.filter(s=>s.active).reduce((s,sub)=>s+sub.amps,0)} A`} color="#3b82f6" icon={Zap} sub={`من ${r.capacity_amps ?? 0} A`} />
                <KpiCard label="الإيراد الشهري"    value={`${(subscribers.filter(s=>s.active).reduce((s,sub)=>s+Number(sub.monthly_fee),0)/1_000_000).toFixed(2)}م`} color="#10b981" icon={BarChart3} sub="مليون دينار" />
                <KpiCard label="الطاقة المتبقية"   value={`${(r.capacity_amps ?? 0) - subscribers.filter(s=>s.active).reduce((s,sub)=>s+sub.amps,0)} A`} color="#f59e0b" icon={Activity} />
              </div>

              {(() => {
                const used = subscribers.filter(s=>s.active).reduce((s,sub)=>s+sub.amps,0);
                const cap  = r.capacity_amps ?? 0;
                const pct  = cap > 0 ? Math.min((used/cap)*100, 100) : 0;
                const bc   = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981';
                return (
                  <div className="glass-card p-4">
                    <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                      <span>استخدام السعة</span>
                      <span style={{ color: bc, fontWeight: 700 }}>{pct.toFixed(1)}% ({used}/{cap} A)</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }}
                                  className="h-full rounded-full" style={{ background: bc }} />
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-5)' }} />
                  <input value={subSearch} onChange={e => setSubSearch(e.target.value)} placeholder="بحث..."
                    className="w-full pr-9 pl-3 py-2 rounded-xl text-xs outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }} />
                </div>
                {(['all','residential','commercial'] as const).map(f => (
                  <button key={f} onClick={() => setSubFilter(f)}
                    className="px-3 py-2 rounded-xl text-xs transition-all"
                    style={{
                      background: subFilter===f ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                      border:     subFilter===f ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      color:      subFilter===f ? '#a78bfa' : 'var(--text-4)',
                      fontFamily: 'var(--font-ibm-arabic)',
                    }}>
                    {f==='all' ? 'الكل' : f==='residential' ? 'سكني' : 'تجاري'}
                  </button>
                ))}
                <button onClick={() => exportCSV(filteredSubs.map(s => ({
                  الاسم: s.full_name, الهاتف: s.phone??'', الأمبيرات: s.amps,
                  النوع: s.sub_type==='residential'?'سكني':'تجاري',
                  الرسوم_الشهرية: s.monthly_fee, الحالة: s.active?'نشط':'غير نشط',
                })), `subscribers-gen-${r.id}.csv`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontFamily: 'var(--font-ibm-arabic)' }}>
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
              </div>

              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ direction: 'rtl' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                        {['#','الاسم','الهاتف','الأمبيرات','النوع','الرسوم الشهرية','الحالة'].map(h => (
                          <th key={h} className="px-3 py-3 text-right text-[11px] font-semibold"
                              style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubs.length === 0 ? (
                        <tr><td colSpan={7} className="py-12 text-center text-sm"
                                style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                          {subscribers.length === 0 ? 'لا توجد بيانات — شغّل seed-generator-records.js' : 'لا توجد نتائج'}
                        </td></tr>
                      ) : filteredSubs.map((s, i) => (
                        <tr key={s.id} style={{ borderBottom: i < filteredSubs.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                          <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'var(--text-5)' }}>{i+1}</td>
                          <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>{s.full_name}</td>
                          <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'var(--text-4)', direction: 'ltr' }}>{s.phone ?? '—'}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono"
                                  style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>{s.amps}A</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                                  style={{ background: s.sub_type==='commercial'?'rgba(249,115,22,0.1)':'rgba(168,85,247,0.1)',
                                           color:      s.sub_type==='commercial'?'#f97316':'#a855f7', fontFamily:'var(--font-ibm-arabic)' }}>
                              {s.sub_type==='commercial' ? 'تجاري' : 'سكني'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs font-mono" style={{ color: '#10b981' }}>
                            {Number(s.monthly_fee).toLocaleString('ar-IQ')} د.ع
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-[10px] flex items-center gap-1"
                                  style={{ color: s.active?'#10b981':'#6b7280', fontFamily:'var(--font-ibm-arabic)' }}>
                              {s.active ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              {s.active ? 'نشط' : 'موقوف'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* LOGS */}
          {tab === 'logs' && (
            <div className="space-y-4">
              <div className="glass-card p-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-5)' }} />
                  <span className="text-xs" style={{ color:'var(--text-5)', fontFamily:'var(--font-ibm-arabic)' }}>من</span>
                  <input type="date" value={logFrom} onChange={e => setLogFrom(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', color:'var(--text-2)' }} />
                  <span className="text-xs" style={{ color:'var(--text-5)', fontFamily:'var(--font-ibm-arabic)' }}>إلى</span>
                  <input type="date" value={logTo} onChange={e => setLogTo(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', color:'var(--text-2)' }} />
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {(['all','start','stop','refuel','fault','maintenance'] as const).map(ev => {
                    const ec = ev !== 'all' ? EVENT_CFG[ev] : null;
                    return (
                      <button key={ev} onClick={() => setLogEvent(ev)}
                        className="px-2.5 py-1 rounded-xl text-[10px] transition-all"
                        style={{
                          background: logEvent===ev ? (ec ? `${ec.color}20` : 'rgba(99,102,241,0.15)') : 'rgba(255,255,255,0.04)',
                          border:     logEvent===ev ? `1px solid ${ec ? ec.color+'40' : 'rgba(99,102,241,0.3)'}` : '1px solid rgba(255,255,255,0.06)',
                          color:      logEvent===ev ? (ec?.color ?? '#a78bfa') : 'var(--text-4)',
                          fontFamily: 'var(--font-ibm-arabic)',
                        }}>
                        {ev==='all' ? 'الكل' : EVENT_CFG[ev].label}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => exportCSV(filteredLogs.map(l => ({
                  التاريخ: new Date(l.logged_at).toLocaleString('ar-IQ'),
                  الحدث:   EVENT_CFG[l.event as keyof typeof EVENT_CFG]?.label ?? l.event,
                  ملاحظة:  l.note??'', وقود_مضاف: l.fuel_added??0, بواسطة: l.logged_by,
                })), `logs-gen-${r.id}.csv`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
                  style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', color:'#10b981', fontFamily:'var(--font-ibm-arabic)' }}>
                  <Download className="w-3 h-3" /> تصدير
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard label="ساعات التشغيل"   value={`${stats.runningHours.toFixed(1)}h`}  color="#10b981" icon={Clock}   sub="في الفترة المحددة" />
                <KpiCard label="جلسات التشغيل"   value={stats.starts}                          color="#3b82f6" icon={Zap}     sub="مرة تشغيل" />
                <KpiCard label="مرات الإيقاف"    value={stats.stops}                           color="#6b7280" icon={WifiOff} sub="مرة إيقاف" />
                <KpiCard label="وقود مضاف"        value={`${stats.fuelAdded.toLocaleString('ar-IQ')} L`} color="#f59e0b" icon={Droplets} sub="لتر" />
              </div>

              <div className="glass-card overflow-hidden">
                <div className="px-5 py-3 border-b flex items-center gap-2"
                     style={{ borderColor:'rgba(255,255,255,0.06)' }}>
                  <BookOpen className="w-4 h-4" style={{ color:'#6366f1' }} />
                  <span className="text-sm font-semibold" style={{ color:'#6366f1', fontFamily:'var(--font-ibm-arabic)' }}>
                    {filteredLogs.length} حدث في الفترة المحددة
                  </span>
                </div>
                {filteredLogs.length === 0 ? (
                  <div className="py-16 text-center">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color:'var(--text-5)' }} />
                    <p className="text-sm" style={{ color:'var(--text-5)', fontFamily:'var(--font-ibm-arabic)' }}>
                      {logs.length === 0 ? 'لا توجد أحداث — شغّل seed-generator-records.js' : 'لا توجد أحداث في هذه الفترة'}
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[480px] overflow-y-auto">
                    {filteredLogs.slice(0, 200).map((log, i) => {
                      const ec   = EVENT_CFG[log.event as keyof typeof EVENT_CFG] ?? EVENT_CFG.start;
                      const Icon = ec.icon;
                      const d    = new Date(log.logged_at);
                      return (
                        <div key={log.id} className="flex items-center gap-3 px-5 py-3"
                             style={{ borderBottom: i < Math.min(filteredLogs.length,200)-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                               style={{ background:`${ec.color}15` }}>
                            <Icon className="w-3.5 h-3.5" style={{ color:ec.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold" style={{ color:ec.color, fontFamily:'var(--font-ibm-arabic)' }}>{ec.label}</span>
                              {log.note && <span className="text-xs" style={{ color:'var(--text-3)', fontFamily:'var(--font-ibm-arabic)' }}>{log.note}</span>}
                              {log.fuel_added > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                                      style={{ background:'rgba(245,158,11,0.12)', color:'#f59e0b', fontFamily:'var(--font-ibm-arabic)' }}>
                                  +{log.fuel_added} لتر
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] mt-0.5" style={{ color:'var(--text-5)', fontFamily:'var(--font-ibm-arabic)' }}>
                              {d.toLocaleDateString('ar-IQ')} — {d.toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'})}
                              &nbsp;•&nbsp; {log.logged_by}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STATS */}
          {tab === 'stats' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <KpiCard label="إجمالي ساعات التشغيل"    value={r.hours.toLocaleString('ar-IQ')}      color="#10b981" icon={Clock}     sub="ساعة منذ التشغيل" />
                <KpiCard label="إجمالي المشتركين"         value={stats.totalSubs}                      color="#a855f7" icon={Users}     sub={`${stats.activeSubs} نشط`} />
                <KpiCard label="الأمبيرات المباعة"        value={`${stats.totalAmps} A`}               color="#3b82f6" icon={Zap}       sub={`من ${r.capacity_amps ?? 0} A`} />
                <KpiCard label="نسبة الاستخدام"           value={`${stats.usedPct}%`}                  color={stats.usedPct>90?'#ef4444':stats.usedPct>70?'#f59e0b':'#10b981'} icon={Activity} sub="من السعة الكاملة" />
                <KpiCard label="الإيراد الشهري التقديري"  value={`${Math.round(stats.monthlyRev/1000)}k`} color="#10b981" icon={BarChart3} sub="ألف دينار عراقي" />
                <KpiCard label="سعر الأمبير الواحد"       value={Number(r.price_per_amp??0).toLocaleString('ar-IQ')} color="#f59e0b" icon={Zap} sub="دينار / أمبير" />
                <KpiCard label="حصة الوقود الشهرية"       value={`${(r.fuel_quota??0).toLocaleString('ar-IQ')} L`} color="#f97316" icon={Droplets} sub="لتر في الشهر" />
                <KpiCard label="القدرة الكهربائية"         value={`${r.power} kW`}                     color="#6366f1" icon={Zap}       sub="كيلوواط" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="glass-card p-5">
                  <p className="text-xs font-semibold mb-4 flex items-center gap-2" style={{ color:'#a78bfa', fontFamily:'var(--font-ibm-arabic)' }}>
                    <Zap className="w-3.5 h-3.5" /> توزيع الأمبيرات حسب الاشتراك
                  </p>
                  {[5,10,15,20].map(amp => {
                    const cnt  = subscribers.filter(s => s.active && s.amps === amp).length;
                    const tot  = subscribers.filter(s => s.active).length || 1;
                    if (!cnt) return null;
                    return (
                      <div key={amp} className="mb-3">
                        <div className="flex justify-between text-xs mb-1" style={{ fontFamily:'var(--font-ibm-arabic)' }}>
                          <span style={{ color:'var(--text-3)' }}>{amp} أمبير</span>
                          <span style={{ color:'#a78bfa' }}>{cnt} مشترك ({Math.round(cnt/tot*100)}%)</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.07)' }}>
                          <motion.div initial={{ width:0 }} animate={{ width:`${(cnt/tot)*100}%` }} transition={{ duration:0.8, delay:amp/100 }}
                                      className="h-full rounded-full" style={{ background:'#a78bfa' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="glass-card p-5">
                  <p className="text-xs font-semibold mb-4 flex items-center gap-2" style={{ color:'#3b82f6', fontFamily:'var(--font-ibm-arabic)' }}>
                    <BarChart3 className="w-3.5 h-3.5" /> ملخص الإيرادات الشهرية
                  </p>
                  {[
                    { label:'المشتركون السكنيون',  subs:subscribers.filter(s=>s.active&&s.sub_type==='residential'), color:'#a855f7' },
                    { label:'المشتركون التجاريون', subs:subscribers.filter(s=>s.active&&s.sub_type==='commercial'),  color:'#f97316' },
                  ].map(({ label, subs, color }) => {
                    const rev  = subs.reduce((s,sub) => s + Number(sub.monthly_fee), 0);
                    const amps = subs.reduce((s,sub) => s + sub.amps, 0);
                    return (
                      <div key={label} className="flex items-center justify-between py-3 border-b last:border-0"
                           style={{ borderColor:'rgba(255,255,255,0.05)' }}>
                        <div>
                          <p className="text-xs font-medium" style={{ color:'var(--text-2)', fontFamily:'var(--font-ibm-arabic)' }}>{label}</p>
                          <p className="text-[10px]" style={{ color:'var(--text-5)', fontFamily:'var(--font-ibm-arabic)' }}>{subs.length} مشترك · {amps} A</p>
                        </div>
                        <p className="text-sm font-bold font-mono" style={{ color }}>{Math.round(rev/1000).toLocaleString('ar-IQ')}k</p>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between pt-3 mt-1">
                    <span className="text-xs font-semibold" style={{ color:'var(--text-3)', fontFamily:'var(--font-ibm-arabic)' }}>الإجمالي الشهري</span>
                    <span className="text-base font-bold" style={{ color:'#10b981' }}>
                      {(stats.monthlyRev/1_000_000).toFixed(2)}م د.ع
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LIVE */}
          {tab === 'live' && (
            <div className="space-y-4">
              {!liveTele ? (
                <div className="glass-card py-20 flex flex-col items-center gap-3">
                  <WifiOff className="w-10 h-10 opacity-20" style={{ color:'var(--text-5)' }} />
                  <p className="text-sm" style={{ color:'var(--text-5)', fontFamily:'var(--font-ibm-arabic)' }}>لا تتوفر قياسات حية لهذا المولد</p>
                </div>
              ) : (() => {
                const t  = liveTele;
                const fc = t.generator.fuel_level_percent > 50 ? '#10b981' : t.generator.fuel_level_percent > 25 ? '#f59e0b' : '#ef4444';
                const tc = t.generator.engine_temperature_c > 90 ? '#f97316' : '#34d399';
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      <KpiCard label="الجهد الكهربائي"   value={`${t.electrical.voltage.toFixed(1)} V`}             color="#a78bfa"  icon={Zap}         />
                      <KpiCard label="الطاقة اللحظية"    value={`${t.electrical.power_kw} kW`}                      color="#3b82f6"  icon={Activity}    />
                      <KpiCard label="التيار الكهربائي"  value={`${t.electrical.current.toFixed(0)} A`}              color="#0ea5e9"  icon={Zap}         />
                      <KpiCard label="التردد"            value={`${t.electrical.frequency_hz} Hz`}                  color="#6366f1"  icon={Activity}    />
                      <KpiCard label="درجة الحرارة"      value={`${t.generator.engine_temperature_c.toFixed(1)}°C`} color={tc}       icon={Thermometer} />
                      <KpiCard label="بطارية التشغيل"    value={`${t.generator.battery_voltage} V`}                 color="#10b981"  icon={Battery}     />
                      <KpiCard label="الطاقة اليومية"    value={`${t.electrical.energy_kwh_today.toFixed(2)} kWh`}  color="#f59e0b"  icon={BarChart3}   />
                      <KpiCard label="حالة المشغّل"      value={t.generator.running ? 'يعمل' : 'متوقف'}               color={t.generator.running?'#10b981':'#6b7280'} icon={t.generator.running?Wifi:WifiOff} />
                    </div>

                    <div className="glass-card p-5">
                      <div className="flex justify-between text-xs mb-2" style={{ fontFamily:'var(--font-ibm-arabic)' }}>
                        <span style={{ color:'var(--text-4)' }}>مستوى الوقود</span>
                        <span style={{ color:fc, fontWeight:700 }}>{t.generator.fuel_level_percent.toFixed(1)}%</span>
                      </div>
                      <div className="h-4 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.07)' }}>
                        <motion.div initial={{ width:0 }} animate={{ width:`${t.generator.fuel_level_percent}%` }} transition={{ duration:1 }}
                                    className="h-full rounded-full" style={{ background:`linear-gradient(90deg, ${fc}, ${fc}88)` }} />
                      </div>
                      <div className="flex justify-between text-[10px] mt-1.5" style={{ color:'var(--text-5)', fontFamily:'var(--font-ibm-arabic)' }}>
                        <span>0%</span><span>50%</span><span>100%</span>
                      </div>
                    </div>

                    {(t.alerts.high_temp || t.alerts.low_oil || t.alerts.overload) && (
                      <div className="glass-card p-4 flex flex-wrap gap-3">
                        {t.alerts.high_temp && <span className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl" style={{ background:'rgba(249,115,22,0.12)', color:'#f97316', fontFamily:'var(--font-ibm-arabic)' }}><AlertTriangle className="w-4 h-4" /> حرارة مرتفعة</span>}
                        {t.alerts.low_oil   && <span className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl" style={{ background:'rgba(239,68,68,0.12)',  color:'#ef4444', fontFamily:'var(--font-ibm-arabic)' }}><AlertTriangle className="w-4 h-4" /> زيت منخفض</span>}
                        {t.alerts.overload  && <span className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl" style={{ background:'rgba(245,158,11,0.12)', color:'#f59e0b', fontFamily:'var(--font-ibm-arabic)' }}><AlertTriangle className="w-4 h-4" /> حمل زائد</span>}
                      </div>
                    )}

                    <p className="text-[11px] text-center" style={{ color:'var(--text-5)', fontFamily:'var(--font-ibm-arabic)' }}>
                      آخر تحديث: {new Date(t.timestamp).toLocaleString('ar-IQ')} &nbsp;•&nbsp; {t.device_id}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
