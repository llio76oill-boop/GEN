'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  Gauge, RefreshCw, Wifi, WifiOff, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Clock, Activity, ExternalLink,
  Cpu, Search, X, List, Map as MapIcon, ArrowLeft, Eye, Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  STATUS_COLOR, STATUS_LABEL, STATUS_BG,
  type Generator, type GeneratorStatus,
} from '@/data/generators';

// ─── ThingSpeak config (قناة المولد الأول الحقيقي) ────────────────────────
const TS_CHANNEL  = '3334757';
const TS_READ_KEY = 'O42YI3R3AGDW5WGP';
const TS_BASE     = 'https://api.thingspeak.com';
const RESULTS     = 60;
const REFRESH_MS  = 15_000;

// ─── Types ────────────────────────────────────────────────────────────────────
interface TsFeed    { created_at: string; entry_id: number; field1: string | null; }
interface TsChannel { id: number; name: string; last_entry_id: number; }
interface TsResponse { channel: TsChannel; feeds: TsFeed[]; }

type FilterStatus = 'all' | GeneratorStatus;
type DrillView    = 'fleet' | 'single';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fv(val: string | null): number | null {
  const n = parseFloat(val ?? '');
  return isNaN(n) ? null : n;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ar-IQ', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function voltageStatus(v: number): { label: string; color: string; bg: string } {
  if (v < 180)  return { label: 'منخفض جداً', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
  if (v < 210)  return { label: 'منخفض',      color: '#f97316', bg: 'rgba(249,115,22,0.12)' };
  if (v <= 240) return { label: 'طبيعي',       color: '#10b981', bg: 'rgba(16,185,129,0.12)' };
  if (v <= 260) return { label: 'مرتفع',       color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
  return               { label: 'مرتفع جداً',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
}

// ─── Dynamic map import (SSR-incompatible) ────────────────────────────────────
const FleetMap = dynamic(() => import('@/components/dashboard/FleetMap'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full flex items-center justify-center rounded-2xl"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}
    >
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
        <p className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
          تحميل الخريطة...
        </p>
      </div>
    </div>
  ),
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.05)' }}
    />
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon, label, value, color, sub, loading,
}: {
  icon: React.ElementType; label: string; value: number | string;
  color: string; sub?: string; loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 relative overflow-hidden flex flex-col gap-1.5"
      style={{ background: 'var(--bg-card)', border: `1px solid ${color}25` }}
    >
      <div className="flex items-center justify-between mb-1">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {sub && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold"
            style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
          >
            {sub}
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-16 mt-1" />
      ) : (
        <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-1)' }}>
          {value}
        </p>
      )}
      <p className="text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
        {label}
      </p>
      <div
        className="absolute -bottom-3 -end-3 w-14 h-14 rounded-full blur-xl opacity-10 pointer-events-none"
        style={{ background: color }}
      />
    </motion.div>
  );
}

// ─── SVG Voltage chart ────────────────────────────────────────────────────────
function VoltageChart({ data, color = '#a855f7' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pad = 10, W = 400, H = 100;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: pad + (1 - (v - min) / range) * (H - pad * 2),
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;
  const gradId = `vg-${color.replace('#', '')}`;
  const y210 = pad + (1 - (210 - min) / range) * (H - pad * 2);
  const y240 = pad + (1 - (240 - min) / range) * (H - pad * 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {y210 > 0 && y210 < H && (
        <line x1={pad} y1={y210} x2={W - pad} y2={y210}
          stroke="#10b981" strokeWidth="0.5" strokeDasharray="4,3" opacity="0.5" />
      )}
      {y240 > 0 && y240 < H && (
        <line x1={pad} y1={y240} x2={W - pad} y2={y240}
          stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="4,3" opacity="0.5" />
      )}
      <path d={area} fill={`url(#${gradId})`} />
      <motion.path
        d={line} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3.5" fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
}

// ─── Generator list row ───────────────────────────────────────────────────────
function GenRow({
  gen, onSelect, onFocus,
}: {
  gen: Generator;
  onSelect: (g: Generator) => void;
  onFocus: (g: Generator) => void;
}) {
  const sc = STATUS_COLOR[gen.status];
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] transition-colors border-b cursor-pointer"
      style={{ borderColor: 'rgba(255,255,255,0.04)' }}
    >
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: sc, boxShadow: `0 0 5px ${sc}` }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono font-semibold" style={{ color: 'var(--text-1)' }}>
          G-{String(gen.id).padStart(4, '0')}
        </p>
        <p className="text-[10px] truncate" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
          {gen.area}
        </p>
      </div>
      <p className="text-[10px] font-mono flex-shrink-0" style={{ color: 'var(--text-5)' }}>
        {gen.power} kW
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onFocus(gen)}
          title="تحديد على الخريطة"
          className="p-1 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-4)' }}
        >
          <MapIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onSelect(gen)}
          title="بيانات ThingSpeak"
          className="p-1 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: '#a855f7' }}
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Single generator drill-down ──────────────────────────────────────────────
function SingleGeneratorView({
  gen, onBack, tsData, tsLoading, tsError,
}: {
  gen: Generator;
  onBack: () => void;
  tsData: TsResponse | null;
  tsLoading: boolean;
  tsError: string | null;
}) {
  const valid    = tsData?.feeds.filter((f) => fv(f.field1) !== null) ?? [];
  const voltages = valid.map((f) => fv(f.field1)!);
  const latest   = voltages.at(-1) ?? null;
  const minV     = voltages.length > 0 ? Math.min(...voltages) : null;
  const maxV     = voltages.length > 0 ? Math.max(...voltages) : null;
  const avgV     = voltages.length > 0 ? voltages.reduce((s, v) => s + v, 0) / voltages.length : null;
  const trend    = voltages.length >= 2 ? voltages.at(-1)! - voltages.at(-2)! : 0;
  const vstatus  = latest !== null ? voltageStatus(latest) : null;
  const sc       = STATUS_COLOR[gen.status];

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="space-y-5"
    >
      {/* Back + generator identity */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text-3)',
            fontFamily: 'var(--font-ibm-arabic)',
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          عودة للقائمة
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: sc }} />
          <span className="text-sm font-bold font-mono" style={{ color: 'var(--text-1)' }}>
            G-{String(gen.id).padStart(4, '0')}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
            {gen.area}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: STATUS_BG[gen.status], color: sc, fontFamily: 'var(--font-ibm-arabic)' }}
          >
            {STATUS_LABEL[gen.status]}
          </span>
        </div>
        <a
          href={`https://thingspeak.com/channels/${TS_CHANNEL}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ms-auto flex items-center gap-1 text-xs"
          style={{ color: 'var(--text-5)' }}
        >
          <ExternalLink className="w-3 h-3" />
          ThingSpeak
        </a>
      </div>

      {/* Live voltage hero */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{ background: 'var(--bg-card)', border: `1px solid ${vstatus?.color ?? '#a855f7'}25` }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
              الفولتية الحية — ThingSpeak Field 1
            </p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold tabular-nums" style={{ color: 'var(--text-1)' }}>
                {tsLoading ? '—' : latest !== null ? latest.toFixed(1) : 'N/A'}
              </span>
              <span className="text-xl mb-1 font-semibold" style={{ color: 'var(--text-4)' }}>V</span>
            </div>
            {vstatus && (
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: vstatus.bg, color: vstatus.color, fontFamily: 'var(--font-ibm-arabic)' }}
                >
                  {vstatus.label === 'طبيعي'
                    ? <CheckCircle2 className="w-3 h-3" />
                    : <AlertTriangle className="w-3 h-3" />}
                  {vstatus.label}
                </span>
                {trend !== 0 && (
                  <span
                    className="text-xs flex items-center gap-1"
                    style={{ color: trend > 0 ? '#f97316' : '#10b981' }}
                  >
                    {trend > 0
                      ? <TrendingUp className="w-3.5 h-3.5" />
                      : <TrendingDown className="w-3.5 h-3.5" />}
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)} V
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            {([
              { label: 'الأعلى',   val: maxV,              color: '#f59e0b' },
              { label: 'الأدنى',   val: minV,              color: '#3b82f6' },
              { label: 'المتوسط',  val: avgV,              color: '#a855f7' },
              { label: 'القراءات', val: valid.length,      color: '#10b981', isInt: true },
            ] satisfies { label: string; val: number | null; color: string; isInt?: boolean }[]).map(({ label, val, color, isInt }) => (
              <div
                key={label}
                className="rounded-xl px-3 py-2"
                style={{ background: `${color}10`, border: `1px solid ${color}20` }}
              >
                <p className="text-sm font-bold tabular-nums" style={{ color }}>
                  {val !== null && val !== undefined
                    ? (isInt ? val : (val as number).toFixed(1))
                    : '—'}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Voltage chart */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4" style={{ color: '#a855f7' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>
            منحنى الفولتية — آخر {valid.length} قراءة
          </span>
        </div>
        <div className="h-28">
          {voltages.length >= 2 ? (
            <VoltageChart data={voltages} color="#a855f7" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-sm"
              style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}
            >
              {tsLoading ? 'جارٍ التحميل...' : tsError ?? 'لا توجد بيانات كافية'}
            </div>
          )}
        </div>
      </div>

      {/* Readings table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}
      >
        <div
          className="px-4 py-3 flex items-center gap-2 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(168,85,247,0.04)' }}
        >
          <Clock className="w-4 h-4" style={{ color: '#a855f7' }} />
          <span className="text-sm font-semibold" style={{ color: '#a855f7', fontFamily: 'var(--font-ibm-arabic)' }}>
            القراءات الأخيرة
          </span>
        </div>
        <div className="overflow-x-auto max-h-52 overflow-y-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead className="sticky top-0" style={{ background: 'var(--bg-card)' }}>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['#', 'الوقت', 'الفولتية (V)', 'الحالة'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-right text-xs font-medium"
                    style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...valid].reverse().slice(0, 15).map((feed) => {
                const v  = fv(feed.field1)!;
                const st = voltageStatus(v);
                return (
                  <tr
                    key={feed.entry_id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    className="hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-2 text-xs font-mono" style={{ color: 'var(--text-5)' }}>
                      {feed.entry_id}
                    </td>
                    <td className="px-4 py-2 text-xs font-mono" style={{ color: 'var(--text-4)' }}>
                      {formatTime(feed.created_at)}
                    </td>
                    <td className="px-4 py-2 font-mono font-semibold" style={{ color: 'var(--text-1)' }}>
                      {v.toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: st.bg,
                          color: st.color,
                          fontFamily: 'var(--font-ibm-arabic)',
                          border: `1px solid ${st.color}30`,
                        }}
                      >
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {valid.length === 0 && (
            <div
              className="py-8 text-center text-sm"
              style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}
            >
              {tsLoading ? 'جارٍ التحميل...' : 'لا توجد قراءات'}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE — مركز القيادة والسيطرة
// ══════════════════════════════════════════════════════════════════════════════
export default function ThingSpeakPage() {
  // ── Real generators from DB ──
  const [generators,   setGenerators]  = useState<Generator[]>([]);
  const [loadingGens,  setLoadingGens] = useState(true);
  const [gensError,    setGensError]   = useState<string | null>(null);

  // ── ThingSpeak data ──
  const [tsData,      setTsData]      = useState<TsResponse | null>(null);
  const [tsLoading,   setTsLoading]   = useState(false);
  const [tsError,     setTsError]     = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // ── View state ──
  const [view,        setView]        = useState<DrillView>('fleet');
  const [selectedGen, setSelectedGen] = useState<Generator | null>(null);
  const [focusedGen,  setFocusedGen]  = useState<Generator | null>(null);

  // ── Filters ──
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [search,       setSearch]       = useState('');

  // ── Fetch real generators on mount ──
  useEffect(() => {
    setLoadingGens(true);
    supabase
      .from('generators')
      .select('id, lat, lng, status, power, area, hours')
      .neq('is_mock', true)
      .then(({ data, error }) => {
        if (error) {
          setGensError(error.message);
        } else {
          setGenerators((data ?? []) as Generator[]);
        }
        setLoadingGens(false);
      });
  }, []);

  // ── Filtered list ──
  const filtered = useMemo(() => {
    let list = generators;
    if (statusFilter !== 'all') list = list.filter((g) => g.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (g) =>
          `g-${String(g.id).padStart(4, '0')}`.includes(q) ||
          g.area.toLowerCase().includes(q)
      );
    }
    return list;
  }, [generators, statusFilter, search]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const online  = filtered.filter((g) => g.status === 'online-grid' || g.status === 'online-gen').length;
    const offline = filtered.filter((g) => g.status === 'offline').length;
    const faults  = filtered.filter((g) => g.status === 'fault').length;
    return { online, offline, faults, total: filtered.length };
  }, [filtered]);

  // ── ThingSpeak fetch ──
  const fetchTs = useCallback(async () => {
    setTsLoading(true);
    setTsError(null);
    try {
      const res = await fetch(
        `${TS_BASE}/channels/${TS_CHANNEL}/fields/1.json?api_key=${TS_READ_KEY}&results=${RESULTS}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTsData(await res.json());
      setLastRefresh(new Date());
    } catch (e) {
      setTsError(e instanceof Error ? e.message : 'فشل الاتصال');
    } finally {
      setTsLoading(false);
    }
  }, []);

  useEffect(() => { fetchTs(); }, [fetchTs]);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchTs, REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, fetchTs]);

  const STATUS_TABS: { key: FilterStatus; label: string; color: string }[] = [
    { key: 'all',         label: 'الكل',        color: 'var(--text-3)' },
    { key: 'online-grid', label: 'شبكة',        color: '#10b981' },
    { key: 'online-gen',  label: 'مولد نشط',    color: '#3b82f6' },
    { key: 'fault',       label: 'عطل',          color: '#f97316' },
    { key: 'offline',     label: 'غير متصل',    color: '#ef4444' },
  ];

  return (
    <div className="space-y-4 flex flex-col h-full" dir="rtl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="relative w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg,#a855f7,#6366f1)',
              boxShadow: '0 0 24px rgba(168,85,247,0.3)',
            }}
          >
            <span
              className="absolute inset-0 rounded-2xl animate-ping opacity-10"
              style={{ background: 'linear-gradient(135deg,#a855f7,#6366f1)' }}
            />
            <Cpu className="w-5 h-5 text-white relative" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>
                مركز القيادة والسيطرة
              </h1>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold"
                style={{
                  background: 'rgba(168,85,247,0.15)',
                  color: '#a855f7',
                  border: '1px solid rgba(168,85,247,0.3)',
                }}
              >
                FLEET
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
              {loadingGens
                ? 'جارٍ تحميل البيانات...'
                : `${generators.length} مولد حقيقي مسجّل في النظام`}
            </p>
          </div>
        </div>

        {/* ThingSpeak status */}
        {view === 'fleet' && (
          <div className="flex items-center gap-2">
            <span
              suppressHydrationWarning
              className="flex items-center gap-1.5 text-xs"
              style={{
                color: tsError ? '#ef4444' : '#10b981',
                fontFamily: 'var(--font-ibm-arabic)',
              }}
            >
              {tsError
                ? <WifiOff className="w-3.5 h-3.5" />
                : <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse block" />}
              {tsError
                ? 'خطأ في الاتصال بـ ThingSpeak'
                : `آخر تحديث: ${lastRefresh.toLocaleTimeString('ar-IQ')}`}
            </span>
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className="px-2.5 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: autoRefresh ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${autoRefresh ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.08)'}`,
                color: autoRefresh ? '#a855f7' : 'var(--text-4)',
                fontFamily: 'var(--font-ibm-arabic)',
              }}
            >
              {autoRefresh ? 'تحديث تلقائي' : 'متوقف'}
            </button>
            <button
              onClick={fetchTs}
              disabled={tsLoading}
              className="p-1.5 rounded-lg transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-4)',
              }}
            >
              <RefreshCw className={`w-4 h-4 ${tsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Single generator drill-down ── */}
        {view === 'single' && selectedGen ? (
          <SingleGeneratorView
            key="single"
            gen={selectedGen}
            onBack={() => { setView('fleet'); setSelectedGen(null); }}
            tsData={tsData}
            tsLoading={tsLoading}
            tsError={tsError}
          />
        ) : (
          <motion.div
            key="fleet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4 flex flex-col flex-1"
          >
            {/* ── KPI ribbon ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
              <KpiCard icon={Zap}           label="متصلة (شبكة + مولد)"  value={kpis.online}  color="#10b981" sub="ONLINE"  loading={loadingGens} />
              <KpiCard icon={WifiOff}       label="غير متصلة"            value={kpis.offline} color="#ef4444" sub="OFFLINE" loading={loadingGens} />
              <KpiCard icon={AlertTriangle} label="أعطال"                 value={kpis.faults}  color="#f97316" sub="FAULT"   loading={loadingGens} />
              <KpiCard icon={Gauge}         label="المولدات المعروضة"     value={kpis.total}   color="#a855f7" sub="TOTAL"   loading={loadingGens} />
            </div>

            {/* ── Error state ── */}
            {gensError && (
              <div
                className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
                <span className="text-sm" style={{ color: '#ef4444', fontFamily: 'var(--font-ibm-arabic)' }}>
                  خطأ في تحميل البيانات: {gensError}
                </span>
              </div>
            )}

            {/* ── Filter bar ── */}
            <div
              className="rounded-2xl p-3 flex flex-wrap items-center gap-3 flex-shrink-0"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}
            >
              {/* Status toggles */}
              <div className="flex items-center gap-1 flex-wrap">
                {STATUS_TABS.map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: statusFilter === key ? `${color}18` : 'transparent',
                      border: `1px solid ${statusFilter === key ? `${color}40` : 'rgba(255,255,255,0.06)'}`,
                      color: statusFilter === key ? color : 'var(--text-5)',
                      fontFamily: 'var(--font-ibm-arabic)',
                    }}
                  >
                    {key !== 'all' && (
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: color }}
                      />
                    )}
                    {label}
                  </button>
                ))}
              </div>

              <div
                className="w-px h-5 flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              />

              {/* Search */}
              <div
                className="flex items-center gap-2 flex-1 min-w-40 rounded-xl px-3 py-1.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-5)' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث: معرّف المولد أو الحي..."
                  className="flex-1 bg-transparent outline-none text-xs"
                  style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}
                  dir="rtl"
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ color: 'var(--text-5)' }}>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <span
                className="text-xs flex-shrink-0"
                style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}
              >
                {filtered.length} / {generators.length}
              </span>
            </div>

            {/* ── Empty state (no real generators yet) ── */}
            {!loadingGens && generators.length === 0 && (
              <div
                className="rounded-2xl p-10 flex flex-col items-center justify-center gap-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
                >
                  <Cpu className="w-8 h-8" style={{ color: '#a855f7' }} />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    لا توجد مولدات مسجّلة بعد
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    يمكن إضافة مولدات حقيقية من قسم أصحاب المولدات
                  </p>
                </div>
              </div>
            )}

            {/* ── 60/40 split: Map + List ── */}
            {(loadingGens || generators.length > 0) && (
              <div
                className="flex gap-3 flex-1 min-h-0"
                style={{ height: 'clamp(420px, 55vh, 680px)' }}
              >
                {/* Map 60% */}
                <div
                  className="flex-[3] min-w-0 rounded-2xl overflow-hidden"
                  style={{ border: '1px solid var(--border-normal)' }}
                >
                  <FleetMap
                    generators={filtered}
                    focusedGen={focusedGen}
                    onSelectGen={(g) => { setSelectedGen(g); setView('single'); }}
                  />
                </div>

                {/* List 40% */}
                <div
                  className="flex-[2] min-w-0 rounded-2xl overflow-hidden flex flex-col"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}
                >
                  <div
                    className="px-3 py-2.5 flex items-center justify-between border-b flex-shrink-0"
                    style={{
                      borderColor: 'rgba(255,255,255,0.05)',
                      background: 'rgba(168,85,247,0.04)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <List className="w-3.5 h-3.5" style={{ color: '#a855f7' }} />
                      <span
                        className="text-xs font-semibold"
                        style={{ color: '#a855f7', fontFamily: 'var(--font-ibm-arabic)' }}
                      >
                        قائمة المولدات
                      </span>
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-5)' }}>
                      {filtered.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    {loadingGens ? (
                      <div className="p-4 space-y-2">
                        {[...Array(6)].map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-10 gap-2">
                        <Search className="w-7 h-7 opacity-20" style={{ color: 'var(--text-4)' }} />
                        <p
                          className="text-sm"
                          style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}
                        >
                          لا توجد نتائج
                        </p>
                      </div>
                    ) : (
                      filtered.map((gen) => (
                        <GenRow
                          key={gen.id}
                          gen={gen}
                          onSelect={(g) => { setSelectedGen(g); setView('single'); }}
                          onFocus={setFocusedGen}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
