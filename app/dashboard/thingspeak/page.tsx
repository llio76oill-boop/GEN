'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gauge, RefreshCw, Wifi, WifiOff, TrendingUp, TrendingDown,
  Minus, AlertTriangle, CheckCircle2, Clock, Radio, Zap,
  BarChart3, Activity, Hash, ExternalLink,
} from 'lucide-react';

// ─── ThingSpeak config ──────────────────────────────────────────────────────
// Read-only API key — safe to expose in client bundle (read access only)
const TS_CHANNEL   = '3334757';
const TS_READ_KEY  = 'O42YI3R3AGDW5WGP';
const TS_BASE      = 'https://api.thingspeak.com';
const RESULTS      = 60;   // how many data points to fetch
const REFRESH_MS   = 15_000;

// ─── Types ──────────────────────────────────────────────────────────────────
interface TsFeed {
  created_at: string;
  entry_id:   number;
  field1:     string | null;
}

interface TsChannel {
  id:          number;
  name:        string;
  description: string;
  created_at:  string;
  updated_at:  string;
  last_entry_id: number;
}

interface TsResponse {
  channel: TsChannel;
  feeds:   TsFeed[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fv(val: string | null): number | null {
  const n = parseFloat(val ?? '');
  return isNaN(n) ? null : n;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ar-IQ');
}

function voltageStatus(v: number): { label: string; color: string; bg: string } {
  if (v < 180)        return { label: 'منخفض جداً', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
  if (v < 210)        return { label: 'منخفض',       color: '#f97316', bg: 'rgba(249,115,22,0.12)' };
  if (v <= 240)       return { label: 'طبيعي',        color: '#10b981', bg: 'rgba(16,185,129,0.12)' };
  if (v <= 260)       return { label: 'مرتفع',        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
  return                      { label: 'مرتفع جداً', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
}

// ─── Animated number ─────────────────────────────────────────────────────────
function AnimNum({ to, decimals = 1 }: { to: number; decimals?: number }) {
  const [val, setVal] = useState(to);
  const prev = useRef(to);
  useEffect(() => {
    const from = prev.current;
    const dur  = 600;
    const t0   = performance.now();
    const raf  = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(from + (to - from) * ease);
      if (p < 1) requestAnimationFrame(raf);
      else { prev.current = to; setVal(to); }
    };
    requestAnimationFrame(raf);
  }, [to]);
  return <>{val.toFixed(decimals)}</>;
}

// ─── SVG Line chart ───────────────────────────────────────────────────────────
function VoltageChart({ data, color = '#a855f7' }: { data: number[]; color?: string }) {
  if (data.length < 2) return (
    <div className="w-full h-full flex items-center justify-center text-sm"
         style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
      بيانات غير كافية
    </div>
  );

  const max  = Math.max(...data);
  const min  = Math.min(...data);
  const range = max - min || 1;
  const pad  = 10;
  const W = 400, H = 100;

  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: pad + (1 - (v - min) / range) * (H - pad * 2),
  }));

  const line  = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area  = `${line} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;
  const grad  = `vg-${color.replace('#','')}`;

  // threshold lines at 210 and 240 V
  const y210 = pad + (1 - (210 - min) / range) * (H - pad * 2);
  const y240 = pad + (1 - (240 - min) / range) * (H - pad * 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      {/* threshold bands */}
      {y210 > 0 && y210 < H && (
        <line x1={pad} y1={y210} x2={W - pad} y2={y210}
              stroke="#10b981" strokeWidth="0.5" strokeDasharray="4,3" opacity="0.4" />
      )}
      {y240 > 0 && y240 < H && (
        <line x1={pad} y1={y240} x2={W - pad} y2={y240}
              stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="4,3" opacity="0.4" />
      )}
      {/* area fill */}
      <path d={area} fill={`url(#${grad})`} />
      {/* line */}
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />
      {/* last dot */}
      <circle
        cx={pts[pts.length - 1].x}
        cy={pts[pts.length - 1].y}
        r="3.5" fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, unit, color, sub,
}: {
  icon: React.ElementType; label: string; value: string | number;
  unit?: string; color: string; sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 relative overflow-hidden"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ background: `${color}20`, border: `1px solid ${color}35` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {sub && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
            {sub}
          </span>
        )}
      </div>
      <p className="text-xl font-bold mb-0.5" style={{ color: 'var(--text-1)' }}>
        {value}{unit && <span className="text-sm font-normal ms-1" style={{ color: 'var(--text-4)' }}>{unit}</span>}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>{label}</p>
      <div className="pointer-events-none absolute -bottom-4 -right-4 w-16 h-16 rounded-full blur-xl opacity-15"
           style={{ background: color }} />
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function ThingSpeakPage() {
  const [data,        setData]        = useState<TsResponse | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [now,         setNow]         = useState<Date>(new Date());

  // Keep clock ticking for "time ago"
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${TS_BASE}/channels/${TS_CHANNEL}/fields/1.json?api_key=${TS_READ_KEY}&results=${RESULTS}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: TsResponse = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الاتصال');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, fetchData]);

  // ── Derived values ────────────────────────────────────────────────────────
  const validFeeds  = data?.feeds.filter((f) => fv(f.field1) !== null) ?? [];
  const voltages    = validFeeds.map((f) => fv(f.field1)!);
  const latest      = voltages.at(-1) ?? null;
  const minV        = voltages.length > 0 ? Math.min(...voltages) : null;
  const maxV        = voltages.length > 0 ? Math.max(...voltages) : null;
  const avgV        = voltages.length > 0 ? voltages.reduce((s, v) => s + v, 0) / voltages.length : null;
  const trend       = voltages.length >= 2 ? voltages.at(-1)! - voltages.at(-2)! : 0;
  const status      = latest !== null ? voltageStatus(latest) : null;
  const secAgo      = data?.feeds.at(-1)?.created_at
    ? Math.floor((now.getTime() - new Date(data.feeds.at(-1)!.created_at).getTime()) / 1000)
    : null;

  return (
    <div className="space-y-6 max-w-6xl" dir="rtl">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
               style={{ background: 'linear-gradient(135deg,#a855f7,#6366f1)', boxShadow: '0 0 30px rgba(168,85,247,0.35)' }}>
            <span className="absolute inset-0 rounded-2xl animate-ping opacity-15"
                  style={{ background: 'linear-gradient(135deg,#a855f7,#6366f1)' }} />
            <Gauge className="w-7 h-7 text-white relative" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>ThingSpeak</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold"
                    style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }}>
                قناة الفولتية
              </span>
              <a
                href={`https://thingspeak.com/channels/${TS_CHANNEL}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs transition-colors hover:opacity-80"
                style={{ color: 'var(--text-5)' }}
              >
                <ExternalLink className="w-3 h-3" />
                {TS_CHANNEL}
              </a>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
              بيانات الفولتية الحية — Channel Field 1
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Connection status */}
          {error ? (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#ef4444', fontFamily: 'var(--font-ibm-arabic)' }}>
              <WifiOff className="w-3.5 h-3.5" />
              {error}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#10b981', fontFamily: 'var(--font-ibm-arabic)' }}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse block" />
              متصل
            </span>
          )}

          <span className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
            آخر تحديث: {lastRefresh.toLocaleTimeString('ar-IQ')}
          </span>

          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: autoRefresh ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${autoRefresh ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.08)'}`,
              color: autoRefresh ? '#a855f7' : 'var(--text-4)',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            <Radio className={`w-3 h-3 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'مباشر' : 'متوقف'}
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Hero: Live voltage display ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 relative overflow-hidden"
        style={{ border: status ? `1px solid ${status.color}30` : undefined }}
      >
        {/* Background glow */}
        <div className="pointer-events-none absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl opacity-10"
             style={{ background: status?.color ?? '#a855f7' }} />

        <div className="flex items-center justify-between flex-wrap gap-6 relative">
          <div>
            <p className="text-xs mb-2 flex items-center gap-2"
               style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
              <Zap className="w-3.5 h-3.5" />
              القراءة الحية — Field 1 (Voltage)
            </p>
            <div className="flex items-end gap-3 mb-3">
              <p className="text-6xl font-bold tabular-nums" style={{ color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
                {latest !== null ? <AnimNum to={latest} decimals={2} /> : loading ? '—' : 'N/A'}
              </p>
              <span className="text-2xl mb-2 font-semibold" style={{ color: 'var(--text-4)' }}>V</span>
            </div>

            {/* Status badge */}
            {status && (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                      style={{ background: status.bg, color: status.color, border: `1px solid ${status.color}40`, fontFamily: 'var(--font-ibm-arabic)' }}>
                  {status.label === 'طبيعي'
                    ? <CheckCircle2 className="w-3.5 h-3.5" />
                    : <AlertTriangle className="w-3.5 h-3.5" />}
                  {status.label}
                </span>
                {trend !== 0 && (
                  <span className="flex items-center gap-1 text-sm"
                        style={{ color: trend > 0 ? '#f97316' : '#10b981' }}>
                    {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {trend > 0 ? '+' : ''}{trend.toFixed(2)} V
                  </span>
                )}
                {trend === 0 && voltages.length >= 2 && (
                  <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-5)' }}>
                    <Minus className="w-4 h-4" />
                    ثابت
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Mini gauge arc */}
          {latest !== null && (
            <div className="w-36 h-20 flex-shrink-0">
              <GaugeArc value={latest} min={180} max={260} color={status?.color ?? '#a855f7'} />
            </div>
          )}
        </div>

        {/* Time since last reading */}
        {secAgo !== null && (
          <div className="mt-4 pt-4 border-t flex items-center gap-2 text-xs"
               style={{ borderColor: 'rgba(255,255,255,0.06)', color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
            <Clock className="w-3.5 h-3.5" />
            آخر قراءة منذ {secAgo < 60 ? `${secAgo} ث` : `${Math.floor(secAgo / 60)} د`}
            {data?.feeds.at(-1)?.entry_id && (
              <span className="ms-3 flex items-center gap-1">
                <Hash className="w-3 h-3" />
                Entry #{data.feeds.at(-1)!.entry_id}
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="أعلى قيمة (آخر 60 قراءة)"
          value={maxV !== null ? maxV.toFixed(2) : '—'}
          unit="V"
          color="#f59e0b"
          sub="MAX"
        />
        <StatCard
          icon={TrendingDown}
          label="أدنى قيمة"
          value={minV !== null ? minV.toFixed(2) : '—'}
          unit="V"
          color="#3b82f6"
          sub="MIN"
        />
        <StatCard
          icon={BarChart3}
          label="المتوسط"
          value={avgV !== null ? avgV.toFixed(2) : '—'}
          unit="V"
          color="#a855f7"
          sub="AVG"
        />
        <StatCard
          icon={Activity}
          label="إجمالي القراءات المُستردة"
          value={validFeeds.length}
          color="#10b981"
          sub="Entries"
        />
      </div>

      {/* ── Chart ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-5"
      >
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: '#a855f7' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>
              منحنى الفولتية — آخر {validFeeds.length} قراءة
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px]" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
            <span className="flex items-center gap-1">
              <span className="w-5 h-px bg-emerald-400 block" style={{ borderTop: '1px dashed #10b981' }} />
              حد أدنى مقبول (210V)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-5 h-px" style={{ borderTop: '1px dashed #f59e0b' }} />
              حد أعلى مقبول (240V)
            </span>
          </div>
        </div>
        <div className="h-36">
          <VoltageChart data={voltages} color="#a855f7" />
        </div>
      </motion.div>

      {/* ── Recent readings table ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="glass-card overflow-hidden"
      >
        <div className="px-5 py-3.5 flex items-center justify-between border-b"
             style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(168,85,247,0.04)' }}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: '#a855f7' }} />
            <span className="text-sm font-semibold" style={{ color: '#a855f7', fontFamily: 'var(--font-ibm-arabic)' }}>
              القراءات الأخيرة
            </span>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
            {validFeeds.length} قراءة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                {['#', 'الوقت', 'الفولتية (V)', 'الحالة'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-right text-xs font-medium"
                      style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...validFeeds].reverse().slice(0, 20).map((feed, i) => {
                const v   = fv(feed.field1)!;
                const st  = voltageStatus(v);
                return (
                  <motion.tr
                    key={feed.entry_id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--text-5)' }}>
                      {feed.entry_id}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--text-4)' }}>
                      {formatTime(feed.created_at)}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold" style={{ color: 'var(--text-1)' }}>
                      {v.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: st.bg, color: st.color, fontFamily: 'var(--font-ibm-arabic)', border: `1px solid ${st.color}30` }}>
                        {st.label}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
              {validFeeds.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm"
                      style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    {error ? `خطأ: ${error}` : 'لا توجد بيانات'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Channel info ─────────────────────────────────────────────────── */}
      {data?.channel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Wifi className="w-4 h-4" style={{ color: '#6366f1' }} />
            <span className="text-sm font-semibold" style={{ color: '#6366f1', fontFamily: 'var(--font-ibm-arabic)' }}>
              معلومات القناة
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'اسم القناة',              value: data.channel.name       },
              { label: 'Channel ID',               value: String(data.channel.id) },
              { label: 'آخر Entry',                value: String(data.channel.last_entry_id ?? '—') },
              { label: 'تاريخ الإنشاء',           value: formatDateTime(data.channel.created_at) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[11px] mb-1" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>{label}</p>
                <p className="text-sm font-mono font-medium" style={{ color: 'var(--text-2)' }}>{value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Loading overlay */}
      <AnimatePresence>
        {loading && !data && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl"
                 style={{ background: 'rgba(8,8,20,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(168,85,247,0.2)' }}>
              <RefreshCw className="w-5 h-5 animate-spin" style={{ color: '#a855f7' }} />
              <span className="text-sm" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
                جارٍ جلب البيانات…
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Semi-circular gauge arc ─────────────────────────────────────────────────
function GaugeArc({ value, min, max, color }: { value: number; min: number; max: number; color: string }) {
  const pct = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const r = 46, cx = 70, cy = 65;
  const sx = cx - r, sy = cy;
  const ang = 180 * pct;
  const ex = cx + Math.cos(((ang - 180) * Math.PI) / 180) * r;
  const ey = cy + Math.sin(((ang - 180) * Math.PI) / 180) * r;
  const la = ang > 180 ? 1 : 0;
  return (
    <svg viewBox="0 0 140 75" className="w-full h-full">
      {/* track */}
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
      {/* value arc */}
      <motion.path
        d={`M ${sx} ${sy} A ${r} ${r} 0 ${la} 1 ${ex} ${ey}`}
        fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
      />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="14" fontWeight="700"
            className="fill-[var(--text-1)]">
        {value.toFixed(1)}
      </text>
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="9" className="fill-[var(--text-4)]">
        V
      </text>
      <text x={sx - 4} y={cy + 14} textAnchor="middle" fontSize="8" className="fill-[var(--text-5)]">{min}</text>
      <text x={cx + r + 6} y={cy + 14} textAnchor="middle" fontSize="8" className="fill-[var(--text-5)]">{max}</text>
    </svg>
  );
}
