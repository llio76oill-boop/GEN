'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  Gauge, RefreshCw, Wifi, WifiOff, TrendingUp, TrendingDown,
  Minus, AlertTriangle, CheckCircle2, Clock, Radio, Zap,
  BarChart3, Activity, Hash, ExternalLink,
  Cpu, Search, Filter, ChevronDown, X, List, Map as MapIcon,
  ArrowUpDown, Eye,
} from 'lucide-react';
import {
  GENERATORS, ANBAR_CITIES, STATUS_COLOR, STATUS_LABEL, STATUS_BG,
  type Generator, type GeneratorStatus,
} from '@/data/generators';

// â”€â”€â”€ Single-generator ThingSpeak config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TS_CHANNEL   = '3334757';
const TS_READ_KEY  = 'O42YI3R3AGDW5WGP';
const TS_BASE      = 'https://api.thingspeak.com';
const RESULTS      = 60;
const REFRESH_MS   = 15_000;

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface TsFeed { created_at: string; entry_id: number; field1: string | null; }
interface TsChannel { id: number; name: string; description: string; created_at: string; updated_at: string; last_entry_id: number; }
interface TsResponse { channel: TsChannel; feeds: TsFeed[]; }

type FilterStatus = 'all' | 'online-grid' | 'online-gen' | 'fault' | 'offline';
type DrillView    = 'fleet' | 'single';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function fv(val: string | null): number | null {
  const n = parseFloat(val ?? '');
  return isNaN(n) ? null : n;
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function voltageStatus(v: number): { label: string; color: string; bg: string } {
  if (v < 180)  return { label: 'Ù…Ù†Ø®ÙØ¶ Ø¬Ø¯Ø§Ù‹', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
  if (v < 210)  return { label: 'Ù…Ù†Ø®ÙØ¶',      color: '#f97316', bg: 'rgba(249,115,22,0.12)' };
  if (v <= 240) return { label: 'Ø·Ø¨ÙŠØ¹ÙŠ',       color: '#10b981', bg: 'rgba(16,185,129,0.12)' };
  if (v <= 260) return { label: 'Ù…Ø±ØªÙØ¹',       color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
  return               { label: 'Ù…Ø±ØªÙØ¹ Ø¬Ø¯Ø§Ù‹', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
}

// â”€â”€â”€ Dynamic imports (Leaflet is SSR-incompatible) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FleetMap = dynamic(() => import('@/components/dashboard/FleetMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center rounded-2xl"
         style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}>
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
        <p className="text-sm" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
          ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø®Ø±ÙŠØ·Ø©...
        </p>
      </div>
    </div>
  ),
});

// â”€â”€â”€ Skeleton loader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.05)' }}
    />
  );
}

// â”€â”€â”€ KPI Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      className="rounded-2xl p-4 relative overflow-hidden flex flex-col gap-1"
      style={{ background: 'var(--bg-card)', border: `1px solid ${color}25`, backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {sub && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold"
                style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>
            {sub}
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-20 mt-1" />
      ) : (
        <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-1)' }}>{value}</p>
      )}
      <p className="text-xs leading-snug" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
        {label}
      </p>
      <div className="pointer-events-none absolute -bottom-3 -end-3 w-14 h-14 rounded-full blur-xl opacity-10"
           style={{ background: color }} />
    </motion.div>
  );
}

// â”€â”€â”€ Single-generator drill-down (existing ThingSpeak chart) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SingleGeneratorView({
  gen, onBack, tsData, tsLoading, tsError,
}: {
  gen: Generator;
  onBack: () => void;
  tsData: TsResponse | null;
  tsLoading: boolean;
  tsError: string | null;
}) {
  const validFeeds = tsData?.feeds.filter((f) => fv(f.field1) !== null) ?? [];
  const voltages   = validFeeds.map((f) => fv(f.field1)!);
  const latest     = voltages.at(-1) ?? null;
  const minV       = voltages.length > 0 ? Math.min(...voltages) : null;
  const maxV       = voltages.length > 0 ? Math.max(...voltages) : null;
  const avgV       = voltages.length > 0 ? voltages.reduce((s, v) => s + v, 0) / voltages.length : null;
  const trend      = voltages.length >= 2 ? voltages.at(-1)! - voltages.at(-2)! : 0;
  const status     = latest !== null ? voltageStatus(latest) : null;

  const sc = STATUS_COLOR[gen.status];

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      className="space-y-5"
    >
      {/* Back bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}
        >
          <ArrowUpDown className="w-3.5 h-3.5 rotate-90" />
          Ø¹ÙˆØ¯Ø© Ù„Ù„Ø£Ø³Ø·ÙˆÙ„
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: sc, boxShadow: `0 0 6px ${sc}` }} />
          <span className="text-sm font-bold font-mono" style={{ color: 'var(--text-1)' }}>G-{String(gen.id).padStart(4,'0')}</span>
          <span className="text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
            {gen.city} â€” {gen.area}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: STATUS_BG[gen.status], color: sc, fontFamily: 'var(--font-ibm-arabic)' }}>
            {STATUS_LABEL[gen.status]}
          </span>
        </div>
        <span className="ms-auto text-xs flex items-center gap-1"
              style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          Ø§Ù„Ù‚Ø±Ø§Ø¡Ø§Øª Ù…Ù† Ù‚Ù†Ø§Ø© Ø§Ù„ØªØ¬Ø±Ø¨Ø© â€” G-TS01
        </span>
      </div>

      {/* Live voltage hero */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{ background: 'var(--bg-card)', border: `1px solid ${status?.color ?? '#a855f7'}25` }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
              Ø§Ù„ÙÙˆÙ„ØªÙŠØ© Ø§Ù„Ø­ÙŠØ© â€” ThingSpeak Field 1
            </p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold tabular-nums" style={{ color: 'var(--text-1)' }}>
                {tsLoading ? 'â€”' : latest !== null ? latest.toFixed(2) : 'N/A'}
              </span>
              <span className="text-xl mb-1 font-semibold" style={{ color: 'var(--text-4)' }}>V</span>
            </div>
            {status && (
              <div className="flex items-center gap-2 mt-2">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: status.bg, color: status.color, fontFamily: 'var(--font-ibm-arabic)' }}>
                  {status.label === 'Ø·Ø¨ÙŠØ¹ÙŠ' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {status.label}
                </span>
                {trend !== 0 && (
                  <span className="text-xs flex items-center gap-1" style={{ color: trend > 0 ? '#f97316' : '#10b981' }}>
                    {trend > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {trend > 0 ? '+' : ''}{trend.toFixed(2)} V
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              { label: 'Ø§Ù„Ø£Ø¹Ù„Ù‰', val: maxV, color: '#f59e0b' },
              { label: 'Ø§Ù„Ø£Ø¯Ù†Ù‰', val: minV, color: '#3b82f6' },
              { label: 'Ø§Ù„Ù…ØªÙˆØ³Ø·', val: avgV, color: '#a855f7' },
              { label: 'Ø§Ù„Ù‚Ø±Ø§Ø¡Ø§Øª', val: validFeeds.length, color: '#10b981', isInt: true },
            ].map(({ label, val, color, isInt }) => (
              <div key={label} className="rounded-xl px-3 py-2"
                   style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                <p className="text-sm font-bold tabular-nums" style={{ color }}>
                  {val !== null ? (isInt ? val : (val as number).toFixed(1)) : 'â€”'}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Voltage chart */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4" style={{ color: '#a855f7' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>
            Ù…Ù†Ø­Ù†Ù‰ Ø§Ù„ÙÙˆÙ„ØªÙŠØ© â€” Ø¢Ø®Ø± {validFeeds.length} Ù‚Ø±Ø§Ø¡Ø©
          </span>
        </div>
        <div className="h-28">
          {voltages.length >= 2 ? (
            <VoltageChart data={voltages} color="#a855f7" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm"
                 style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
              {tsLoading ? 'Ø¬Ø§Ø±Ù Ø§Ù„ØªØ­Ù…ÙŠÙ„...' : 'Ø¨ÙŠØ§Ù†Ø§Øª ØºÙŠØ± ÙƒØ§ÙÙŠØ©'}
            </div>
          )}
        </div>
      </div>

      {/* Last readings */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}>
        <div className="px-4 py-3 flex items-center gap-2 border-b"
             style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(168,85,247,0.04)' }}>
          <Clock className="w-4 h-4" style={{ color: '#a855f7' }} />
          <span className="text-sm font-semibold" style={{ color: '#a855f7', fontFamily: 'var(--font-ibm-arabic)' }}>
            Ø§Ù„Ù‚Ø±Ø§Ø¡Ø§Øª Ø§Ù„Ø£Ø®ÙŠØ±Ø©
          </span>
        </div>
        <div className="overflow-x-auto max-h-48 overflow-y-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead className="sticky top-0" style={{ background: 'var(--bg-card)' }}>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['#', 'Ø§Ù„ÙˆÙ‚Øª', 'Ø§Ù„ÙÙˆÙ„ØªÙŠØ© (V)', 'Ø§Ù„Ø­Ø§Ù„Ø©'].map((h) => (
                  <th key={h} className="px-4 py-2 text-right text-xs font-medium"
                      style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...validFeeds].reverse().slice(0,15).map((feed) => {
                const v = fv(feed.field1)!;
                const st = voltageStatus(v);
                return (
                  <tr key={feed.entry_id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-xs font-mono" style={{ color: 'var(--text-5)' }}>{feed.entry_id}</td>
                    <td className="px-4 py-2 text-xs font-mono" style={{ color: 'var(--text-4)' }}>{formatTime(feed.created_at)}</td>
                    <td className="px-4 py-2 font-mono font-semibold" style={{ color: 'var(--text-1)' }}>{v.toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: st.bg, color: st.color, fontFamily: 'var(--font-ibm-arabic)', border: `1px solid ${st.color}30` }}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ SVG Voltage chart (reused) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function VoltageChart({ data, color = '#a855f7' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pad = 10, W = 400, H = 100;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: pad + (1 - (v - min) / range) * (H - pad * 2),
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;
  const grad = `vg-${color.replace('#','')}`;
  const y210 = pad + (1 - (210 - min) / range) * (H - pad * 2);
  const y240 = pad + (1 - (240 - min) / range) * (H - pad * 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {y210 > 0 && y210 < H && <line x1={pad} y1={y210} x2={W-pad} y2={y210} stroke="#10b981" strokeWidth="0.5" strokeDasharray="4,3" opacity="0.4" />}
      {y240 > 0 && y240 < H && <line x1={pad} y1={y240} x2={W-pad} y2={y240} stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="4,3" opacity="0.4" />}
      <path d={area} fill={`url(#${grad})`} />
      <motion.path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeOut' }} />
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="3.5" fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
}

// â”€â”€â”€ Virtualized generator row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function GenRow({ gen, onSelect, onFocus }: { gen: Generator; onSelect: (g: Generator) => void; onFocus: (g: Generator) => void }) {
  const sc = STATUS_COLOR[gen.status];
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] cursor-pointer transition-colors border-b"
      style={{ borderColor: 'rgba(255,255,255,0.04)' }}
    >
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sc, boxShadow: `0 0 5px ${sc}` }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono font-semibold" style={{ color: 'var(--text-1)' }}>
          G-{String(gen.id).padStart(4,'0')}
        </p>
        <p className="text-[10px] truncate" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
          {gen.city} â€” {gen.area}
        </p>
      </div>
      <div className="text-end flex-shrink-0">
        <p className="text-[10px] font-mono" style={{ color: gen.voltage && gen.voltage > 0 ? '#a855f7' : 'var(--text-5)' }}>
          {gen.voltage && gen.voltage > 0 ? `${gen.voltage}V` : 'â€”'}
        </p>
        <p className="text-[10px]" style={{ color: 'var(--text-5)' }}>{gen.power} kW</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onFocus(gen)}
          title="ØªØ­Ø¯ÙŠØ¯ Ø¹Ù„Ù‰ Ø§Ù„Ø®Ø±ÙŠØ·Ø©"
          className="p-1 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-4)' }}
        >
          <MapIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onSelect(gen)}
          title="ÙØªØ­ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØªÙØµÙŠÙ„ÙŠØ©"
          className="p-1 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: '#a855f7' }}
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FLEET COMMAND CENTER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export default function ThingSpeakPage() {
  /* â”€â”€ ThingSpeak state â”€â”€ */
  const [tsData,        setTsData]        = useState<TsResponse | null>(null);
  const [tsLoading,     setTsLoading]     = useState(false);
  const [tsError,       setTsError]       = useState<string | null>(null);
  const [autoRefresh,   setAutoRefresh]   = useState(true);
  const [lastRefresh,   setLastRefresh]   = useState<Date>(new Date());

  /* â”€â”€ View state â”€â”€ */
  const [view,          setView]          = useState<DrillView>('fleet');
  const [selectedGen,   setSelectedGen]   = useState<Generator | null>(null);
  const [focusedGen,    setFocusedGen]    = useState<Generator | null>(null);

  /* â”€â”€ Filters â”€â”€ */
  const [statusFilter,  setStatusFilter]  = useState<FilterStatus>('all');
  const [cityFilter,    setCityFilter]    = useState<string[]>([]);
  const [search,        setSearch]        = useState('');
  const [cityOpen,      setCityOpen]      = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);

  /* â”€â”€ Filtered generators (memoized) â”€â”€ */
  const filtered = useMemo(() => {
    let list = GENERATORS;
    if (statusFilter !== 'all') list = list.filter((g) => g.status === statusFilter);
    if (cityFilter.length > 0)  list = list.filter((g) => cityFilter.includes(g.city));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (g) =>
          `g-${String(g.id).padStart(4,'0')}`.includes(q) ||
          g.area.includes(q) ||
          g.city.includes(q)
      );
    }
    return list;
  }, [statusFilter, cityFilter, search]);

  /* â”€â”€ KPIs (from filtered list) â”€â”€ */
  const kpis = useMemo(() => {
    const online  = filtered.filter((g) => g.status === 'online-grid' || g.status === 'online-gen').length;
    const offline = filtered.filter((g) => g.status === 'offline').length;
    const faults  = filtered.filter((g) => g.status === 'fault').length;
    const withV   = filtered.filter((g) => g.voltage && g.voltage > 0);
    const avgV    = withV.length > 0
      ? (withV.reduce((s, g) => s + (g.voltage ?? 0), 0) / withV.length).toFixed(1)
      : 'â€”';
    return { online, offline, faults, avgV, total: filtered.length };
  }, [filtered]);

  /* â”€â”€ ThingSpeak fetch â”€â”€ */
  const fetchTs = useCallback(async () => {
    setTsLoading(true); setTsError(null);
    try {
      const res = await fetch(`${TS_BASE}/channels/${TS_CHANNEL}/fields/1.json?api_key=${TS_READ_KEY}&results=${RESULTS}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTsData(await res.json());
      setLastRefresh(new Date());
    } catch(e) {
      setTsError(e instanceof Error ? e.message : 'ÙØ´Ù„ Ø§Ù„Ø§ØªØµØ§Ù„');
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

  /* â”€â”€ City dropdown close on outside click â”€â”€ */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectGen = (g: Generator) => {
    setSelectedGen(g);
    setView('single');
  };
  const handleFocusGen = (g: Generator) => {
    setFocusedGen(g);
  };

  const STATUS_TABS: { key: FilterStatus; label: string; color: string }[] = [
    { key: 'all',         label: 'Ø§Ù„ÙƒÙ„',      color: 'var(--text-3)' },
    { key: 'online-grid', label: 'Ø´Ø¨ÙƒØ©',      color: '#10b981' },
    { key: 'online-gen',  label: 'Ù…ÙˆÙ„Ø¯ Ù†Ø´Ø·',  color: '#3b82f6' },
    { key: 'fault',       label: 'Ø¹Ø·Ù„',       color: '#f97316' },
    { key: 'offline',     label: 'ØºÙŠØ± Ù…ØªØµÙ„',  color: '#ef4444' },
  ];

  const cityNames = ANBAR_CITIES.map((c) => c.city);

  return (
    <div className="space-y-4 h-full flex flex-col" dir="rtl">

      {/* â”€â”€ Page header â”€â”€ */}
      <div className="flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg,#a855f7,#6366f1)', boxShadow: '0 0 24px rgba(168,85,247,0.3)' }}>
            <span className="absolute inset-0 rounded-2xl animate-ping opacity-10"
                  style={{ background: 'linear-gradient(135deg,#a855f7,#6366f1)' }} />
            <Cpu className="w-5 h-5 text-white relative" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Ù…Ø±ÙƒØ² Ø§Ù„Ù‚ÙŠØ§Ø¯Ø© ÙˆØ§Ù„Ø³ÙŠØ·Ø±Ø©</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold"
                    style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }}>
                FLEET
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
              {GENERATORS.length.toLocaleString('ar-IQ')} Ù…ÙˆÙ„Ø¯ Ø¹Ø¨Ø± Ù…Ø­Ø§ÙØ¸Ø© Ø§Ù„Ø£Ù†Ø¨Ø§Ø±
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {view === 'fleet' && (
            <>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: tsError ? '#ef4444' : '#10b981', fontFamily: 'var(--font-ibm-arabic)' }}>
                {tsError ? <WifiOff className="w-3.5 h-3.5" /> : <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse block" />}
                {tsError ? tsError : `Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ«: ${lastRefresh.toLocaleTimeString('ar-IQ')}`}
              </span>
              <button
                onClick={() => setAutoRefresh((v) => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: autoRefresh ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${autoRefresh ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  color: autoRefresh ? '#a855f7' : 'var(--text-4)',
                  fontFamily: 'var(--font-ibm-arabic)',
                }}
              >
                <Radio className={`w-3 h-3 ${autoRefresh ? 'animate-pulse' : ''}`} />
                {autoRefresh ? 'Ù…Ø¨Ø§Ø´Ø±' : 'Ù…ØªÙˆÙ‚Ù'}
              </button>
              <button onClick={fetchTs} disabled={tsLoading}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-4)' }}>
                <RefreshCw className={`w-4 h-4 ${tsLoading ? 'animate-spin' : ''}`} />
              </button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
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
          <motion.div key="fleet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 flex flex-col flex-1">

            {/* â”€â”€ Phase 1: KPI Ribbon â”€â”€ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
              <KpiCard icon={Zap}          label="Ù…ÙˆÙ„Ø¯Ø§Øª Ù…ØªØµÙ„Ø© (Ù…ÙØµÙÙŽÙ‘Ø§Ø©)" value={kpis.online}  color="#10b981" sub="ONLINE"  />
              <KpiCard icon={WifiOff}      label="ØºÙŠØ± Ù…ØªØµÙ„Ø©"                 value={kpis.offline} color="#ef4444" sub="OFFLINE" />
              <KpiCard icon={AlertTriangle} label="Ø£Ø¹Ø·Ø§Ù„ / ÙÙˆÙ„ØªÙŠØ© Ù…Ù†Ø®ÙØ¶Ø©"   value={kpis.faults}  color="#f97316" sub="FAULT"   />
              <KpiCard icon={Gauge}         label="Ù…ØªÙˆØ³Ø· ÙÙˆÙ„ØªÙŠØ© Ø§Ù„Ø´Ø¨ÙƒØ©"      value={kpis.avgV}    color="#a855f7" sub="AVG V"   />
            </div>

            {/* â”€â”€ Phase 2: Filter bar â”€â”€ */}
            <div
              className="rounded-2xl p-3 flex flex-wrap items-center gap-3 flex-shrink-0"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)', backdropFilter: 'blur(12px)' }}
            >
              {/* Status toggles */}
              <div className="flex items-center gap-1 flex-wrap">
                {STATUS_TABS.map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background:  statusFilter === key ? `${color}18` : 'transparent',
                      border:      `1px solid ${statusFilter === key ? `${color}40` : 'rgba(255,255,255,0.06)'}`,
                      color:       statusFilter === key ? color : 'var(--text-5)',
                      fontFamily:  'var(--font-ibm-arabic)',
                    }}
                  >
                    {key !== 'all' && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />}
                    {label}
                  </button>
                ))}
              </div>

              <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />

              {/* City multi-select */}
              <div className="relative" ref={cityRef}>
                <button
                  onClick={() => setCityOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all"
                  style={{
                    background: cityFilter.length > 0 ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${cityFilter.length > 0 ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    color: cityFilter.length > 0 ? '#6366f1' : 'var(--text-4)',
                    fontFamily: 'var(--font-ibm-arabic)',
                  }}
                >
                  <Filter className="w-3 h-3" />
                  {cityFilter.length > 0 ? `Ø§Ù„Ù…Ù†Ø§Ø·Ù‚ (${cityFilter.length})` : 'Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ù†Ø§Ø·Ù‚'}
                  <ChevronDown className={`w-3 h-3 transition-transform ${cityOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {cityOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute end-0 top-full mt-1 z-50 rounded-xl p-2 min-w-40 shadow-xl"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)', backdropFilter: 'blur(16px)' }}
                    >
                      {cityNames.map((city) => {
                        const active = cityFilter.includes(city);
                        return (
                          <button
                            key={city}
                            onClick={() => setCityFilter((prev) =>
                              active ? prev.filter((c) => c !== city) : [...prev, city]
                            )}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-start transition-colors hover:bg-white/5"
                            style={{ color: active ? '#6366f1' : 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}
                          >
                            <span className={`w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border ${active ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`}>
                              {active && <span className="text-white text-[8px]">âœ“</span>}
                            </span>
                            {city}
                          </button>
                        );
                      })}
                      {cityFilter.length > 0 && (
                        <button
                          onClick={() => setCityFilter([])}
                          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs mt-1 border-t transition-colors hover:bg-white/5"
                          style={{ color: '#ef4444', borderColor: 'rgba(255,255,255,0.05)', fontFamily: 'var(--font-ibm-arabic)' }}
                        >
                          <X className="w-3 h-3" /> Ù…Ø³Ø­ Ø§Ù„ÙÙ„ØªØ±
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Search */}
              <div className="flex items-center gap-2 flex-1 min-w-40 rounded-xl px-3 py-1.5"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-5)' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ø¨Ø­Ø«: G-0042 Ø£Ùˆ Ø§Ø³Ù… Ø§Ù„Ø­ÙŠ..."
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

              {/* Result count */}
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                {filtered.length.toLocaleString('ar-IQ')} / {GENERATORS.length.toLocaleString('ar-IQ')}
              </span>
            </div>

            {/* â”€â”€ Phase 3: Split layout â”€â”€ */}
            <div className="flex gap-3 flex-1 min-h-0" style={{ height: 'clamp(420px, 55vh, 680px)' }}>

              {/* Map: 60% */}
              <div className="flex-[3] min-w-0 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-normal)' }}>
                <FleetMap
                  generators={filtered}
                  focusedGen={focusedGen}
                  onSelectGen={handleSelectGen}
                />
              </div>

              {/* Data grid: 40% */}
              <div className="flex-[2] min-w-0 rounded-2xl overflow-hidden flex flex-col"
                   style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}>
                {/* Grid header */}
                <div className="px-3 py-2.5 flex items-center justify-between border-b flex-shrink-0"
                     style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(168,85,247,0.04)' }}>
                  <div className="flex items-center gap-2">
                    <List className="w-3.5 h-3.5" style={{ color: '#a855f7' }} />
                    <span className="text-xs font-semibold" style={{ color: '#a855f7', fontFamily: 'var(--font-ibm-arabic)' }}>
                      Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ÙˆÙ„Ø¯Ø§Øª
                    </span>
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-5)' }}>
                    {filtered.length.toLocaleString()}
                  </span>
                </div>

                {/* Virtualized scrollable rows */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  {filtered.slice(0, 200).map((gen) => (
                    <GenRow
                      key={gen.id}
                      gen={gen}
                      onSelect={handleSelectGen}
                      onFocus={handleFocusGen}
                    />
                  ))}
                  {filtered.length > 200 && (
                    <div className="px-4 py-3 text-center text-xs"
                         style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                      ÙŠÙØ¹Ø±Ø¶ Ø£ÙˆÙ„ 200 Ù†ØªÙŠØ¬Ø© â€” Ø§Ø³ØªØ®Ø¯Ù… Ø§Ù„ÙÙ„ØªØ±Ø© Ù„Ù„ØªØ¶ÙŠÙŠÙ‚
                    </div>
                  )}
                  {filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full py-12 gap-3">
                      <Search className="w-8 h-8 opacity-20" style={{ color: 'var(--text-4)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                        Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…ÙˆÙ„Ø¯Ø§Øª ØªØ·Ø§Ø¨Ù‚ Ø§Ù„ÙÙ„ØªØ±
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
