'use client';

// ============================================================
// DynamicTelemetryDashboard
// Reads thingspeak_fields_map (JSONB) from a generator record,
// fetches the latest feed from ThingSpeak, then renders a
// specific widget per field type:
//   • voltage  → semi-circle Gauge (0–300 V, safe zone 180–240)
//   • current  → Sparkline line chart (live load fluctuation)
//   • power    → Bold KPI stat card (W / kW)
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Zap, RefreshCw, AlertTriangle,
  WifiOff, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FieldsMap = Record<string, string>; // { field1: "voltage", field2: "current", … }

interface FeedEntry {
  entry_id:   number;
  created_at: string;
  [fieldKey: string]: string | number | null;
}

interface TelemetryData {
  latestValues:  Record<string, number | null>; // { field1: 228.4, field2: 12.5, … }
  historyValues: Record<string, number[]>;      // for sparklines
  lastUpdated:   string | null;
}

interface Props {
  channelId:    string;
  readApiKey:   string;
  fieldsMap:    FieldsMap;           // e.g. { field1: "voltage", field2: "current" }
  /** how many historical points (for sparklines), default 30 */
  historyCount?: number;
  /** polling interval ms, default 15 000 */
  pollIntervalMs?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fv(s: string | null | undefined): number | null {
  const n = parseFloat(s ?? '');
  return isNaN(n) ? null : n;
}

function fieldLabel(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('voltage') || lower.includes('volt') || lower.includes('فولت'))  return 'voltage';
  if (lower.includes('current') || lower.includes('amp')  || lower.includes('أمبير')) return 'current';
  if (lower.includes('power')   || lower.includes('watt') || lower.includes('قدرة'))  return 'power';
  return 'generic';
}

// ── Voltage Gauge Widget ──────────────────────────────────────────────────────

function VoltageGauge({ value }: { value: number | null }) {
  // Semi-circle: 0–300V, danger < 180, safe 180–240, warn > 240
  const MIN = 0, MAX = 300;
  const SAFE_LO = 180, SAFE_HI = 240;

  const pct = value !== null ? Math.min(Math.max((value - MIN) / (MAX - MIN), 0), 1) : null;
  // Arc: 0 = -225deg (bottom-left), 1 = 45deg (bottom-right), span = 270deg
  const START_DEG = -225;
  const SPAN_DEG  = 270;

  // SVG arc path helper
  const polarToXY = (cx: number, cy: number, r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const arcPath = (cx: number, cy: number, r: number, startDeg: number, endDeg: number) => {
    const s = polarToXY(cx, cy, r, startDeg);
    const e = polarToXY(cx, cy, r, endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  };

  const cx = 100, cy = 100, r = 72;
  const trackPath  = arcPath(cx, cy, r, START_DEG, START_DEG + SPAN_DEG);
  // Safe zone highlight
  const safeLoPct  = (SAFE_LO - MIN) / (MAX - MIN);
  const safeHiPct  = (SAFE_HI - MIN) / (MAX - MIN);
  const safeStart  = START_DEG + safeLoPct * SPAN_DEG;
  const safeEnd    = START_DEG + safeHiPct * SPAN_DEG;
  const safePath   = arcPath(cx, cy, r, safeStart, safeEnd);

  const needleDeg  = pct !== null ? START_DEG + pct * SPAN_DEG : null;
  const needleTip  = needleDeg !== null ? polarToXY(cx, cy, r - 10, needleDeg) : null;
  const needleBase1 = needleDeg !== null ? polarToXY(cx, cy, 8, needleDeg + 90) : null;
  const needleBase2 = needleDeg !== null ? polarToXY(cx, cy, 8, needleDeg - 90) : null;

  // Colour logic
  const gaugeColor =
    value === null            ? '#6b7280' :
    value < SAFE_LO           ? '#ef4444' :
    value <= SAFE_HI          ? '#10b981' :
    value <= 260              ? '#f59e0b' :
                                '#ef4444';

  const statusLabel =
    value === null            ? '—' :
    value < 180               ? 'منخفض جداً' :
    value < 210               ? 'منخفض' :
    value <= 240              ? 'طبيعي' :
    value <= 260              ? 'مرتفع' :
                                'مرتفع جداً';

  return (
    <div className="glass-card p-4 flex flex-col items-center gap-3" dir="rtl">
      {/* Label */}
      <div className="flex items-center gap-2 self-start">
        <div className="w-6 h-6 rounded-md flex items-center justify-center"
             style={{ background: 'rgba(234,179,8,0.12)' }}>
          <Zap className="w-3.5 h-3.5" style={{ color: '#eab308' }} />
        </div>
        <span className="text-xs font-semibold" style={{ color: '#eab308', fontFamily: 'var(--font-ibm-arabic)' }}>
          الفولتية
        </span>
      </div>

      {/* SVG gauge */}
      <svg viewBox="0 0 200 160" className="w-full max-w-[220px]">
        {/* Track */}
        <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14"
              strokeLinecap="round" />
        {/* Safe-zone highlight */}
        <path d={safePath} fill="none" stroke="rgba(16,185,129,0.18)" strokeWidth="14"
              strokeLinecap="round" />
        {/* Value arc */}
        {pct !== null && (
          <motion.path
            d={arcPath(cx, cy, r, START_DEG, START_DEG + pct * SPAN_DEG)}
            fill="none" stroke={gaugeColor} strokeWidth="14" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        )}
        {/* Needle */}
        {needleTip && needleBase1 && needleBase2 && (
          <motion.polygon
            points={`${needleTip.x.toFixed(1)},${needleTip.y.toFixed(1)} ${needleBase1.x.toFixed(1)},${needleBase1.y.toFixed(1)} ${needleBase2.x.toFixed(1)},${needleBase2.y.toFixed(1)}`}
            fill={gaugeColor} opacity="0.9"
            initial={{ opacity: 0 }} animate={{ opacity: 0.9 }}
            transition={{ delay: 0.9 }}
          />
        )}
        {/* Hub */}
        <circle cx={cx} cy={cy} r="5" fill={gaugeColor} opacity="0.85" />
        {/* Min / Max ticks */}
        <text x="28" y="148" fill="rgba(255,255,255,0.3)" fontSize="10" textAnchor="middle">0</text>
        <text x="172" y="148" fill="rgba(255,255,255,0.3)" fontSize="10" textAnchor="middle">300</text>
        {/* Centre value */}
        <text x={cx} y={cy + 30} fill="white" fontSize="26" fontWeight="700" textAnchor="middle"
              fontFamily="monospace">
          {value !== null ? value.toFixed(1) : '—'}
        </text>
        <text x={cx} y={cy + 48} fill="rgba(255,255,255,0.45)" fontSize="11" textAnchor="middle">
          Volt
        </text>
      </svg>

      {/* Status badge */}
      <span className="text-xs px-3 py-1 rounded-full font-medium"
            style={{
              background: `${gaugeColor}18`,
              color:       gaugeColor,
              border:      `1px solid ${gaugeColor}35`,
              fontFamily:  'var(--font-ibm-arabic)',
            }}>
        {statusLabel}
      </span>

      {/* Safe range legend */}
      <p className="text-[10px]" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
        المدى الطبيعي: 180–240 V
      </p>
    </div>
  );
}

// ── Current Sparkline Widget ──────────────────────────────────────────────────

function CurrentSparkline({ history }: { history: number[] }) {
  if (history.length < 2) {
    return (
      <div className="glass-card p-4 flex flex-col gap-3" dir="rtl">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
               style={{ background: 'rgba(59,130,246,0.12)' }}>
            <Activity className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
          </div>
          <span className="text-xs font-semibold" style={{ color: '#3b82f6', fontFamily: 'var(--font-ibm-arabic)' }}>
            التيار الكهربائي
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
          بحاجة إلى قراءتين على الأقل...
        </p>
      </div>
    );
  }

  const latest = history.at(-1)!;
  const prev   = history.at(-2)!;
  const trend  = latest - prev;

  const min = Math.min(...history) - 1;
  const max = Math.max(...history) + 1;
  const W = 400, H = 80;

  const pts = history.map((v, i) => ({
    x: (i / (history.length - 1)) * W,
    y: H - ((v - min) / (max - min)) * H,
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const fillPath = `${linePath} L ${W} ${H} L 0 ${H} Z`;

  return (
    <div className="glass-card p-4 flex flex-col gap-3" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
               style={{ background: 'rgba(59,130,246,0.12)' }}>
            <Activity className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
          </div>
          <span className="text-xs font-semibold" style={{ color: '#3b82f6', fontFamily: 'var(--font-ibm-arabic)' }}>
            التيار الكهربائي
          </span>
        </div>
        {/* Latest value */}
        <div className="text-left">
          <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-1)' }}>
            {latest.toFixed(2)}
          </span>
          <span className="text-xs ml-1" style={{ color: 'var(--text-4)' }}>A</span>
        </div>
      </div>

      {/* SVG sparkline */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
        <defs>
          <linearGradient id="curr-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"    />
          </linearGradient>
        </defs>
        <path d={fillPath} fill="url(#curr-fill)" />
        <motion.path
          d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        {/* Latest dot */}
        <circle
          cx={pts.at(-1)!.x.toFixed(1)} cy={pts.at(-1)!.y.toFixed(1)} r="4"
          fill="#3b82f6"
        />
      </svg>

      {/* Trend */}
      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
        {trend > 0.01  ? <TrendingUp   className="w-3.5 h-3.5 text-orange-400" /> :
         trend < -0.01 ? <TrendingDown className="w-3.5 h-3.5 text-green-400"  /> :
                         <Minus        className="w-3.5 h-3.5"                  />}
        <span style={{ color: trend > 0.01 ? '#f97316' : trend < -0.01 ? '#10b981' : 'var(--text-4)' }}>
          {trend > 0 ? '+' : ''}{trend.toFixed(2)} A
        </span>
        &nbsp;•&nbsp; {history.length} قراءة
      </div>
    </div>
  );
}

// ── Power KPI Widget ──────────────────────────────────────────────────────────

function PowerKpi({ value }: { value: number | null }) {
  const displayW  = value !== null ? value.toFixed(1)           : '—';
  const displayKw = value !== null ? (value / 1000).toFixed(3)  : '—';

  const color =
    value === null    ? '#6b7280' :
    value < 500       ? '#10b981' :
    value < 3000      ? '#3b82f6' :
    value < 8000      ? '#f59e0b' :
                        '#ef4444';

  return (
    <div className="glass-card p-4 flex flex-col gap-3" dir="rtl"
         style={{ border: `1px solid ${color}20` }}>
      {/* Label */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center"
             style={{ background: `${color}18` }}>
          <Zap className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-xs font-semibold" style={{ color, fontFamily: 'var(--font-ibm-arabic)' }}>
          القدرة الكهربائية
        </span>
      </div>

      {/* Big number */}
      <div>
        <motion.p
          key={displayW}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-5xl font-bold tabular-nums leading-none"
          style={{ color: 'var(--text-1)', letterSpacing: '-0.03em' }}
        >
          {displayW}
        </motion.p>
        <p className="text-base mt-1 font-medium" style={{ color }}>W</p>
      </div>

      {/* Kilowatt equivalent */}
      <div className="flex items-center justify-between pt-2 border-t"
           style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <span className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
          بالكيلوواط
        </span>
        <span className="text-sm font-semibold tabular-nums" style={{ color }}>
          {displayKw} <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>kW</span>
        </span>
      </div>

      {/* Glow bar */}
      <div className="w-full h-1.5 rounded-full overflow-hidden"
           style={{ background: 'rgba(255,255,255,0.05)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: '0%' }}
          animate={{ width: value !== null ? `${Math.min((value / 10000) * 100, 100)}%` : '0%' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ── Generic field widget (fallback) ──────────────────────────────────────────

function GenericWidget({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="glass-card p-4 flex flex-col gap-2" dir="rtl">
      <span className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
        {label}
      </span>
      <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text-1)' }}>
        {value !== null ? value.toFixed(2) : '—'}
      </p>
    </div>
  );
}

// ── Widget router ─────────────────────────────────────────────────────────────

function FieldWidget({
  fieldKey, rawLabel, latest, history,
}: {
  fieldKey:  string;
  rawLabel:  string;
  latest:    number | null;
  history:   number[];
}) {
  const type = fieldLabel(rawLabel);
  if (type === 'voltage') return <VoltageGauge value={latest} />;
  if (type === 'current') return <CurrentSparkline history={history} />;
  if (type === 'power')   return <PowerKpi value={latest} />;
  return <GenericWidget label={rawLabel} value={latest} />;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DynamicTelemetryDashboard({
  channelId,
  readApiKey,
  fieldsMap,
  historyCount   = 30,
  pollIntervalMs = 15_000,
}: Props) {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeFields = Object.keys(fieldsMap); // [ "field1", "field2", … ]

  const fetchTelemetry = useCallback(async () => {
    if (!channelId || !readApiKey || activeFields.length === 0) return;

    setLoading(true);
    setError(null);

    // Build field list query param (comma-separated numbers)
    const fieldNums = activeFields.map((k) => k.replace('field', '')).join(',');
    const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readApiKey}&results=${historyCount}&fields=${fieldNums}`;

    try {
      const res   = await fetch(url);
      if (!res.ok) throw new Error(`ThingSpeak ${res.status}`);
      const data  = await res.json() as { feeds: FeedEntry[] };
      const feeds = data.feeds ?? [];

      const latestEntry  = feeds.at(-1);
      const latestValues: Record<string, number | null>  = {};
      const historyValues: Record<string, number[]>      = {};

      for (const fk of activeFields) {
        latestValues[fk]  = fv(latestEntry?.[fk] as string | null);
        historyValues[fk] = feeds
          .map((f) => fv(f[fk] as string | null))
          .filter((v): v is number => v !== null);
      }

      setTelemetry({
        latestValues,
        historyValues,
        lastUpdated: latestEntry?.created_at ?? null,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [channelId, readApiKey, activeFields.join(','), historyCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial fetch + polling
  useEffect(() => {
    fetchTelemetry();
    timerRef.current = setInterval(fetchTelemetry, pollIntervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchTelemetry, pollIntervalMs]);

  if (activeFields.length === 0) return null;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: '#a855f7' }} />
          <span className="text-sm font-semibold" style={{ color: '#a855f7', fontFamily: 'var(--font-ibm-arabic)' }}>
            لوحة القياسات الحية
          </span>
          {loading && (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: '#a855f7' }} />
          )}
        </div>
        <div className="flex items-center gap-3">
          {telemetry?.lastUpdated && (
            <span className="text-[11px]" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
              آخر تحديث:{' '}
              {new Date(telemetry.lastUpdated).toLocaleTimeString('ar-IQ', {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
              })}
            </span>
          )}
          <button
            onClick={fetchTelemetry}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: 'rgba(168,85,247,0.08)',
              border:     '1px solid rgba(168,85,247,0.2)',
              color:      '#a855f7',
              fontFamily: 'var(--font-ibm-arabic)',
              opacity:    loading ? 0.6 : 1,
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs" style={{ color: '#ef4444', fontFamily: 'var(--font-ibm-arabic)' }}>
              خطأ في جلب البيانات: {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No channel */}
      {!channelId && (
        <div className="flex items-center gap-2 px-4 py-8 rounded-xl justify-center"
             style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <WifiOff className="w-5 h-5" style={{ color: 'var(--text-5)' }} />
          <p className="text-sm" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
            لم يُربط بقناة ThingSpeak
          </p>
        </div>
      )}

      {/* Widget grid */}
      {channelId && (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        >
          {activeFields.map((fk) => (
            <FieldWidget
              key={fk}
              fieldKey={fk}
              rawLabel={fieldsMap[fk]}
              latest={telemetry?.latestValues[fk] ?? null}
              history={telemetry?.historyValues[fk] ?? []}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
