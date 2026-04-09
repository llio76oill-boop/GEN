'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  Cpu, Wifi, WifiOff, Zap, AlertTriangle, CheckCircle2,
  RefreshCw, ArrowUpRight, Info, ServerCrash, Radio,
  Activity, BarChart3, Clock, Layers,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────
interface LiveRow {
  id: number;
  generator_code: string;
  status: 'online' | 'offline' | 'fault';
  current_load: number;
  voltage: number;
  last_seen: string;
}

type HealthStatus = 'checking' | 'ok' | 'degraded' | 'error';

// ─── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60)  return `${sec}ث`;
  if (sec < 3600) return `${Math.floor(sec / 60)}د`;
  return `${Math.floor(sec / 3600)}س`;
}

function statusColor(s: LiveRow['status']) {
  return s === 'online' ? '#10b981' : s === 'fault' ? '#f59e0b' : '#6b7280';
}
function statusLabel(s: LiveRow['status']) {
  return s === 'online' ? 'متصل' : s === 'fault' ? 'عطل' : 'منقطع';
}

// ─── Animated number ────────────────────────────────────────────────────────
function AnimNum({ value, unit = '' }: { value: number; unit?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / 30;
    const id = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(id); }
      else setDisplay(Math.round(start));
    }, 20);
    return () => clearInterval(id);
  }, [value]);
  return <>{display.toLocaleString()}{unit}</>;
}

// ─── Pulse ring around icon ─────────────────────────────────────────────────
function PulseRing({ color }: { color: string }) {
  return (
    <span
      className="absolute inset-0 rounded-full animate-ping opacity-30"
      style={{ background: color }}
    />
  );
}

// ─── KPI card ───────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon, label, value, unit, color, sub, pulse,
}: {
  icon: React.ElementType; label: string; value: number; unit?: string;
  color: string; sub?: string; pulse?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 flex flex-col gap-3 relative overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div className="relative w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
             style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
          {pulse && <PulseRing color={color} />}
          <Icon className="w-5 h-5 relative" style={{ color }} />
        </div>
        {sub && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
            {sub}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
          <AnimNum value={value} unit={unit} />
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
          {label}
        </p>
      </div>
      {/* bg glow */}
      <div className="pointer-events-none absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20"
           style={{ background: color }} />
    </motion.div>
  );
}

// ─── Health badge ────────────────────────────────────────────────────────────
function HealthBadge({ status }: { status: HealthStatus }) {
  const map: Record<HealthStatus, { label: string; color: string; dot: string }> = {
    checking: { label: 'جارٍ الفحص…',   color: '#6b7280', dot: 'animate-spin' },
    ok:       { label: 'يعمل بكفاءة',   color: '#10b981', dot: 'animate-pulse' },
    degraded: { label: 'أداء منخفض',    color: '#f59e0b', dot: 'animate-pulse' },
    error:    { label: 'لا يمكن الوصول', color: '#ef4444', dot: '' },
  };
  const m = map[status];
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium"
          style={{ color: m.color, fontFamily: 'var(--font-ibm-arabic)' }}>
      <span className={`w-2 h-2 rounded-full ${m.dot}`} style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

// ─── Mini SVG sparkline ──────────────────────────────────────────────────────
function Spark({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const r = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 40 - ((v - min) / r) * 36,
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  return (
    <svg viewBox="0 0 100 44" className="w-full h-10" preserveAspectRatio="none">
      <motion.path d={line} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeOut' }} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function ThingsBoardPage() {
  const [rows, setRows]             = useState<LiveRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [health, setHealth]         = useState<HealthStatus>('checking');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab]   = useState<'telemetry' | 'architecture' | 'guide'>('telemetry');

  // mock load-history per generator (last 10 readings)
  const [sparkData] = useState<Record<string, number[]>>(() => ({}));

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('generators_live_status')
        .select('*')
        .order('last_seen', { ascending: false })
        .limit(50);
      if (error) { setHealth('error'); return; }
      setRows(data ?? []);
      setHealth(data && data.length > 0 ? 'ok' : 'degraded');
      setLastRefresh(new Date());
    } catch {
      setHealth('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchRows, 8000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchRows]);

  // derived stats
  const total   = rows.length;
  const online  = rows.filter((r) => r.status === 'online').length;
  const fault   = rows.filter((r) => r.status === 'fault').length;
  const offline = rows.filter((r) => r.status === 'offline').length;
  const avgLoad = total ? Math.round(rows.reduce((s, r) => s + r.current_load, 0) / total) : 0;
  const avgVolt = total ? Math.round(rows.reduce((s, r) => s + r.voltage, 0) / total) : 0;

  const TABS = [
    { key: 'telemetry',    label: 'التلغراف الحي',     icon: Activity },
    { key: 'architecture', label: 'معمارية التكامل',   icon: Layers   },
    { key: 'guide',        label: 'دليل الإعداد',      icon: Info     },
  ] as const;

  return (
    <div className="space-y-6 max-w-6xl" dir="rtl">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {/* TB Logo */}
          <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
               style={{ background: 'linear-gradient(135deg,#10b981,#0ea5e9)', boxShadow: '0 0 30px rgba(16,185,129,0.35)' }}>
            <span className="absolute inset-0 rounded-2xl animate-ping opacity-20"
                  style={{ background: 'linear-gradient(135deg,#10b981,#0ea5e9)' }} />
            <Cpu className="w-7 h-7 text-white relative" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>ThingsBoard</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                IoT Platform
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
              مركز بيانات إنترنت الأشياء — 3,000 مولد في الأنبار
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <HealthBadge status={health} />
          <span className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
            آخر تحديث: {lastRefresh.toLocaleTimeString('ar-IQ')}
          </span>
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: autoRefresh ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${autoRefresh ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: autoRefresh ? '#10b981' : 'var(--text-4)',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            <Radio className={`w-3 h-3 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'مباشر' : 'متوقف'}
          </button>
          <button
            onClick={fetchRows}
            disabled={loading}
            className="p-2 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── KPI row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="lg:col-span-2">
          <KpiCard icon={Cpu}          label="أجهزة مُسجَّلة حياً"  value={total}   color="#6366f1" sub="TB Devices" pulse />
        </div>
        <KpiCard icon={CheckCircle2}   label="متصلة"                 value={online}  color="#10b981" sub="Online" />
        <KpiCard icon={AlertTriangle}  label="أعطال نشطة"            value={fault}   color="#f59e0b" sub="Fault"  pulse={fault > 0} />
        <KpiCard icon={WifiOff}        label="منقطعة"                 value={offline} color="#6b7280" sub="Offline" />
        <KpiCard icon={Zap}            label="متوسط الحمل (kW)"       value={avgLoad} color="#0ea5e9" sub="AvgLoad" />
      </div>

      {/* ── Secondary metrics strip ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Avg voltage */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }}>
            <BarChart3 className="w-5 h-5" style={{ color: '#a855f7' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs mb-1" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
              متوسط الفولتية
            </p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>
              <AnimNum value={avgVolt} unit=" V" />
            </p>
          </div>
          <div className="w-24 opacity-70">
            <Spark data={rows.slice(0, 10).map((r) => r.voltage)} color="#a855f7" />
          </div>
        </motion.div>

        {/* Webhook health */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative"
               style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <span className="absolute inset-0 rounded-xl animate-ping opacity-20 bg-emerald-500" />
            <Wifi className="w-5 h-5 relative" style={{ color: '#10b981' }} />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
              Edge Function Webhook
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-emerald-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                جاهز للاستقبال
              </span>
              <span className="text-[10px] font-mono text-gray-500">POST /v1/thingsboard-webhook</span>
            </div>
          </div>
        </motion.div>

        {/* Rule engine */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <ServerCrash className="w-5 h-5" style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
              Rule Engine
            </p>
            <p className="text-sm font-semibold" style={{ color: '#f59e0b', fontFamily: 'var(--font-ibm-arabic)' }}>
              في انتظار الربط
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 glass-card p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key as typeof activeTab)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
            style={{
              background: activeTab === key ? 'rgba(16,185,129,0.12)' : 'transparent',
              border: activeTab === key ? '1px solid rgba(16,185,129,0.25)' : '1px solid transparent',
              color: activeTab === key ? '#10b981' : 'var(--text-4)',
              fontFamily: 'var(--font-ibm-arabic)',
            }}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Telemetry ──────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'telemetry' && (
          <motion.div key="telemetry"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
            className="space-y-4">

            {rows.length === 0 && !loading && (
              <div className="glass-card p-12 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                     style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <Cpu className="w-8 h-8" style={{ color: '#6366f1' }} />
                </div>
                <div>
                  <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    لا توجد بيانات حية حتى الآن
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    ستظهر هنا قراءات التلغراف فور بدء إرسالها من ThingsBoard Rule Engine
                  </p>
                </div>
                <span className="text-xs font-mono px-3 py-1.5 rounded-full"
                      style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                  جدول: generators_live_status
                </span>
              </div>
            )}

            {rows.length > 0 && (
              <>
                {/* Status distribution bar */}
                <div className="glass-card p-5 space-y-3">
                  <p className="text-xs font-medium" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    توزيع الحالات ({total} جهاز مُبلَّغ)
                  </p>
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                    {online  > 0 && <div className="rounded-full transition-all" style={{ flex: online,  background: '#10b981' }} />}
                    {fault   > 0 && <div className="rounded-full transition-all" style={{ flex: fault,   background: '#f59e0b' }} />}
                    {offline > 0 && <div className="rounded-full transition-all" style={{ flex: offline, background: '#374151' }} />}
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />متصل ({online})</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"   />عطل ({fault})</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600"    />منقطع ({offline})</span>
                  </div>
                </div>

                {/* Telemetry table */}
                <div className="glass-card overflow-hidden">
                  <div className="px-5 py-3 flex items-center justify-between border-b"
                       style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>
                      آخر قراءات التلغراف
                    </p>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-5)' }}>
                      {rows.length} سجل
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {['كود المولد', 'الحالة', 'الحمل (kW)', 'الفولتية (V)', 'آخر إرسال'].map((h) => (
                            <th key={h} className="px-5 py-3 text-right text-xs font-medium"
                                style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <motion.tr key={row.id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="group border-b last:border-0 hover:bg-white/[0.02] transition-colors"
                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                            <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--text-3)' }}>
                              {row.generator_code}
                            </td>
                            <td className="px-5 py-3">
                              <span className="flex items-center gap-1.5 text-xs font-medium"
                                    style={{ color: statusColor(row.status), fontFamily: 'var(--font-ibm-arabic)' }}>
                                <span className="w-1.5 h-1.5 rounded-full"
                                      style={{ background: statusColor(row.status) }} />
                                {statusLabel(row.status)}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full overflow-hidden bg-white/5">
                                  <div className="h-full rounded-full bg-blue-400 transition-all"
                                       style={{ width: `${Math.min((row.current_load / 500) * 100, 100)}%` }} />
                                </div>
                                <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>
                                  {row.current_load.toFixed(1)}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-xs font-mono" style={{ color: 'var(--text-3)' }}>
                              <span className={`${row.voltage < 340 || row.voltage > 420 ? 'text-amber-400' : ''}`}>
                                {row.voltage.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                                <Clock className="w-3 h-3" />
                                {timeAgo(row.last_seen)} مضت
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── Tab: Architecture ───────────────────────────────────── */}
        {activeTab === 'architecture' && (
          <motion.div key="arch"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
            className="space-y-4">

            {/* Flow diagram */}
            <div className="glass-card p-8">
              <p className="text-sm font-semibold mb-8 text-center"
                 style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
                تدفق البيانات من المولدات إلى لوحة التحكم
              </p>
              <div className="flex flex-col lg:flex-row items-center justify-center gap-0">
                {[
                  { icon: Zap,         label: 'مولد كهربائي',        sub: 'MQTT Client',           color: '#10b981', bg: 'from-emerald-500/20 to-emerald-600/10' },
                  { icon: Radio,       label: 'ThingsBoard',          sub: 'MQTT Broker + Rule Engine', color: '#6366f1', bg: 'from-indigo-500/20 to-indigo-600/10' },
                  { icon: ArrowUpRight,label: 'Edge Function',        sub: 'Supabase Webhook',      color: '#0ea5e9', bg: 'from-sky-500/20 to-sky-600/10'     },
                  { icon: Cpu,         label: 'generators_live_status', sub: 'Supabase DB table',   color: '#a855f7', bg: 'from-purple-500/20 to-purple-600/10' },
                  { icon: BarChart3,   label: 'لوحة التحكم',          sub: 'S.P.G.M.S Dashboard',  color: '#f59e0b', bg: 'from-amber-500/20 to-amber-600/10'   },
                ].map((node, i, arr) => (
                  <div key={node.label} className="flex flex-col lg:flex-row items-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.12 }}
                      className={`flex flex-col items-center gap-3 bg-gradient-to-br ${node.bg} rounded-2xl p-5 w-36 border hover:scale-105 transition-transform`}
                      style={{ borderColor: `${node.color}30` }}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                           style={{ background: `${node.color}20`, border: `1px solid ${node.color}40` }}>
                        <node.icon className="w-6 h-6" style={{ color: node.color }} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>{node.label}</p>
                        <p className="text-[10px] mt-0.5 font-mono leading-snug" style={{ color: 'var(--text-5)' }}>{node.sub}</p>
                      </div>
                    </motion.div>
                    {i < arr.length - 1 && (
                      <motion.div
                        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                        transition={{ delay: i * 0.12 + 0.1, duration: 0.4 }}
                        className="w-8 lg:w-10 h-0.5 lg:h-auto lg:w-10 mx-1 my-1 lg:my-0"
                        style={{ background: `linear-gradient(90deg, ${node.color}60, ${arr[i+1].color}60)` }}
                      >
                        <div className="hidden lg:flex items-center justify-center text-gray-600 text-lg">→</div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Integration specs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[
                {
                  title: 'بروتوكول الاتصال',
                  color: '#6366f1',
                  rows: [
                    ['النوع', 'MQTT v3.1.1 / Webhook HTTP'],
                    ['المنفذ (MQTT)', '1883 (أو 8883 TLS)'],
                    ['Topic Pattern', 'v1/devices/me/telemetry'],
                    ['Webhook Method', 'POST + x-webhook-secret'],
                    ['Payload Format', 'JSON'],
                  ],
                },
                {
                  title: 'حقول البيانات المُرسَلة',
                  color: '#10b981',
                  rows: [
                    ['generator_code', 'string (معرّف المولد)'],
                    ['status', 'online | offline | fault'],
                    ['current_load', 'number (kW · 0–10,000)'],
                    ['voltage', 'number (V · 0–50,000)'],
                    ['last_seen', 'auto — يُضاف من Edge Fn'],
                  ],
                },
              ].map((card) => (
                <div key={card.title} className="glass-card overflow-hidden">
                  <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)', background: `${card.color}08` }}>
                    <p className="text-sm font-semibold" style={{ color: card.color, fontFamily: 'var(--font-ibm-arabic)' }}>{card.title}</p>
                  </div>
                  <table className="w-full text-xs">
                    <tbody>
                      {card.rows.map(([k, v]) => (
                        <tr key={k} className="border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                          <td className="px-5 py-2.5 font-mono" style={{ color: card.color }}>{k}</td>
                          <td className="px-5 py-2.5" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Tab: Setup Guide ────────────────────────────────────── */}
        {activeTab === 'guide' && (
          <motion.div key="guide"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
            className="space-y-4">
            {[
              {
                step: '01',
                title: 'تشغيل جدول قاعدة البيانات',
                color: '#10b981',
                content: (
                  <div className="space-y-2">
                    <p className="text-sm" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                      شغّل ملف الـ Migration التالي في Supabase SQL Editor:
                    </p>
                    <pre className="rounded-xl p-4 text-xs font-mono leading-5 overflow-x-auto"
                         style={{ background: 'rgba(0,0,0,0.3)', color: '#86efac', border: '1px solid rgba(16,185,129,0.15)' }}>
{`supabase/migrations/20260409_generators_live_status.sql`}
                    </pre>
                  </div>
                ),
              },
              {
                step: '02',
                title: 'نشر Edge Function على Supabase',
                color: '#6366f1',
                content: (
                  <div className="space-y-2">
                    <div className="rounded-xl p-4 font-mono text-xs leading-6 overflow-x-auto"
                         style={{ background: 'rgba(0,0,0,0.3)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.15)' }}>
                      <p style={{ color: '#6b7280' }}># من جذر المشروع:</p>
                      <p>supabase functions deploy thingsboard-webhook</p>
                      <p style={{ color: '#6b7280' }}># ثم أضف السر:</p>
                      <p>supabase secrets set WEBHOOK_SECRET=&lt;قيمة-سرية&gt;</p>
                    </div>
                  </div>
                ),
              },
              {
                step: '03',
                title: 'إعداد ThingsBoard Rule Chain',
                color: '#f59e0b',
                content: (
                  <ol className="space-y-2 list-none" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                    {[
                      'افتح ThingsBoard → Rule Engine → Rule Chains → Root Rule Chain',
                      'أضف Node جديد من نوع "REST API Call"',
                      'في حقل Endpoint URL: الصق رابط الـ Webhook أعلاه',
                      'أضف Header: x-webhook-secret = &lt;WEBHOOK_SECRET&gt;',
                      'في حقل Request Body: {"generator_code": "${deviceName}", "status": "${status}", "current_load": ${current_load}, "voltage": ${voltage}}',
                      'اربط الـ Node بـمخرج Post telemetry أو الـ Alarm الخاص بك',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full font-mono text-xs flex items-center justify-center mt-0.5"
                              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                          {i + 1}
                        </span>
                        <span style={{ color: 'var(--text-3)' }} dangerouslySetInnerHTML={{ __html: item }} />
                      </li>
                    ))}
                  </ol>
                ),
              },
              {
                step: '04',
                title: 'التحقق من الاتصال',
                color: '#0ea5e9',
                content: (
                  <div className="space-y-2">
                    <p className="text-sm" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                      اختبر الـ Webhook مباشرة من Terminal:
                    </p>
                    <pre className="rounded-xl p-4 text-xs font-mono leading-5 overflow-x-auto"
                         style={{ background: 'rgba(0,0,0,0.3)', color: '#67e8f9', border: '1px solid rgba(14,165,233,0.15)' }}>
{`curl -X POST https://YOUR.supabase.co/functions/v1/thingsboard-webhook \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-secret: YOUR_SECRET" \\
  -d '{"generator_code":"GEN-RM-0001","status":"online","current_load":450,"voltage":380}'`}
                    </pre>
                    <p className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                      الرد المتوقع: <code className="font-mono text-emerald-400">&#123;"ok":true,...&#125;</code> — ثم اضغط تحديث في تاب التلغراف الحي
                    </p>
                  </div>
                ),
              },
            ].map(({ step, title, color, content }) => (
              <motion.div key={step}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: parseInt(step) * 0.08 }}
                className="glass-card overflow-hidden">
                <div className="p-5 border-b flex items-center gap-4"
                     style={{ borderColor: 'rgba(255,255,255,0.05)', background: `${color}08` }}>
                  <span className="text-2xl font-black font-mono"
                        style={{ color: `${color}50`, lineHeight: 1 }}>{step}</span>
                  <h3 className="text-sm font-semibold" style={{ color, fontFamily: 'var(--font-ibm-arabic)' }}>
                    {title}
                  </h3>
                </div>
                <div className="p-5">{content}</div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
