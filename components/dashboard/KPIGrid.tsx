'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Clock, AlertTriangle, Activity, Cpu } from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';

/* ?? Animated counter ?? */
function Counter({ to, duration = 1.4 }: { to: number; duration?: number }) {
  const [v, setV] = useState(0);
  const t0 = useRef<number | null>(null);
  useEffect(() => {
    const raf = (ts: number) => {
      if (!t0.current) t0.current = ts;
      const p = Math.min((ts - t0.current) / (duration * 1000), 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setV(Math.floor(ease * to));
      if (p < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
    return () => { t0.current = null; };
  }, [to, duration]);
  return <>{v.toLocaleString('ar-EG')}</>;
}

/* ?? Tiny area sparkline ?? */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - ((v - min) / range) * 80 - 10,
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fill = `${line} L ${pts[pts.length - 1].x} 100 L 0 100 Z`;
  const id   = `sp-${color.replace('#', '')}`;
  return (
    <svg viewBox="0 0 100 60" className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${id})`} />
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />
    </svg>
  );
}

/* ?? Arc gauge ?? */
function Gauge({ pct, color }: { pct: number; color: string }) {
  const r   = 36;
  const cx  = 55, cy = 52;
  const sx  = cx - r, sy = cy;
  const ang = 180 * pct;
  const ex  = cx + Math.cos(((ang - 180) * Math.PI) / 180) * r;
  const ey  = cy + Math.sin(((ang - 180) * Math.PI) / 180) * r;
  const la  = ang > 180 ? 1 : 0;
  return (
    <svg viewBox="0 0 110 70" className="w-full h-auto">
      <path
        d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" strokeLinecap="round"
      />
      <motion.path
        d={`M ${sx} ${sy} A ${r} ${r} 0 ${la} 1 ${ex} ${ey}`}
        fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color}90)` }}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="13" fontWeight="700" className="fill-[var(--text-1)]">
        {Math.round(pct * 100)}%
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="8" className="fill-[var(--text-4)]">
        تحميل الشبكة
      </text>
    </svg>
  );
}

const POWER_24H = [420,380,350,310,290,280,310,380,450,520,580,620,640,630,610,590,560,600,640,665,650,620,580,540];
const GRID_24H  = [200,180,160,140,130,120,145,178,215,255,285,305,315,308,298,283,272,295,315,326,318,305,282,260];
const FAULT_24H = [28,32,25,38,42,35,40,44,41,47,44,50,47,47,45,50,48,52,47,49,51,47,47,47];

export default function KPIGrid() {
  const { stats } = useDashboardStats();

  const totalOnline  = stats.onlineGridCount + stats.onlineGenCount;
  const totalOffline = stats.faultCount + stats.offlineCount;
  const total        = stats.totalGenerators;
  const onlinePct    = total > 0 ? (totalOnline / total * 100).toFixed(1) + '%' : '0%';
  const offlinePct   = total > 0 ? (totalOffline / total * 100).toFixed(1) + '%' : '0%';
  const onlinePowerMW  = Math.round(stats.onlinePowerKW / 1000 * 10) / 10;
  const consumedMW     = Math.round(onlinePowerMW * 0.74 * 10) / 10;
  const loadPct        = onlinePowerMW > 0 ? onlinePowerMW / (onlinePowerMW * 1.35) : 0; // 74% consumption ratio

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">

      {/* ? Total power produced + consumed */}
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="glass-card p-4 col-span-2 sm:col-span-1"
      >
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span className="text-xs text-[var(--text-4)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            الطاقة المنتجة
          </span>
        </div>
        <div className="text-3xl font-bold text-[var(--text-1)] mb-0.5">
          <Counter to={onlinePowerMW} />
          <span className="text-sm text-[var(--text-4)] font-normal ms-1">MW</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400 text-xs mb-2"
             style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
          <TrendingUp className="w-3 h-3" />
          <span>+4.2% من الأمس</span>
        </div>

        {/* Consumed energy bar */}
        <div className="mb-2">
          <div className="flex justify-between text-[10px] mb-1" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            <span style={{ color: 'var(--text-4)' }}>المستهلكة</span>
            <span className="font-bold" style={{ color: '#f59e0b' }}>{consumedMW} MW</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
            <motion.div
              className="h-full rounded-full bg-amber-500"
              initial={{ width: '0%' }}
              animate={{ width: '74%' }}
              transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[9px] mt-1" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
            74% نسبة الاستهلاك من الإنتاج
          </p>
        </div>

        <div className="h-12"><Sparkline data={POWER_24H} color="#10b981" /></div>
      </motion.div>

      {/* ? Fleet status */}
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-card p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          <span className="text-xs text-[var(--text-4)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            حالة الأسطول
          </span>
        </div>
        {[
          { label: 'متصل',    to: totalOnline,  pct: onlinePct,  color: 'bg-emerald-500 dark:bg-emerald-400', w: onlinePct,  textColor: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'غير متصل', to: totalOffline, pct: offlinePct, color: 'bg-red-500 dark:bg-red-400',    w: offlinePct, textColor: 'text-red-500 dark:text-red-400'     },
        ].map((row) => (
          <div key={row.label} className="mb-2 last:mb-0">
            <div className="flex justify-between text-xs mb-1"
                 style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
              <span className="text-[var(--text-3)]">{row.label}</span>
              <span className={`font-bold ${row.textColor}`}><Counter to={row.to} /></span>
            </div>
            <div className="h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${row.color}`}
                initial={{ width: '0%' }}
                animate={{ width: row.w }}
                transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
        <p className="text-[10px] text-[var(--text-4)] mt-2"
           style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
          من إجمالي {stats.totalGenerators.toLocaleString()} مولد
        </p>
      </motion.div>

      {/* ? Load gauge */}
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
        className="glass-card p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          <span className="text-xs text-[var(--text-4)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            حمل الشبكة
          </span>
        </div>
        <Gauge pct={loadPct || 0.74} color="#10b981" />
        <p className="text-center text-[10px] text-[var(--text-4)] -mt-1"
           style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
          {onlinePowerMW || '—'} / {Math.round((onlinePowerMW || 2500) * 1.35)} MW
        </p>
      </motion.div>

      {/* ? Operating hours */}
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.29 }}
        className="glass-card p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          <span className="text-xs text-[var(--text-4)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            ساعات التشغيل
          </span>
        </div>
        {[
          { dot: 'bg-emerald-500 dark:bg-emerald-400', label: 'شبكة وطنية', h: stats.onlineGridCount },
          { dot: 'bg-blue-500 dark:bg-blue-400',   label: 'مولدات محلية', h: stats.onlineGenCount },
        ].map((row) => (
          <div key={row.label} className="mb-2.5 last:mb-0">
            <div className="flex items-center gap-2 text-xs mb-0.5"
                 style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
              <span className={`w-2 h-2 rounded-full block ${row.dot}`} />
              <span className="text-[var(--text-3)]">{row.label}</span>
            </div>
            <div className="text-xl font-bold text-[var(--text-1)]">
              <Counter to={row.h} />
              <span className="text-xs text-[var(--text-4)] ms-1">ساعة</span>
            </div>
          </div>
        ))}
        <div className="mt-2 h-8"><Sparkline data={GRID_24H} color="#818cf8" /></div>
      </motion.div>

      {/* ? Active faults */}
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
        className="glass-card p-4"
        style={{ borderColor: 'rgba(249,115,22,0.18)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
          <span className="text-xs text-[var(--text-4)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            الأعطال النشطة
          </span>
        </div>
        <div className="text-4xl font-bold text-orange-500 dark:text-orange-400 mb-0.5">
          <Counter to={stats.faultCount} />
        </div>
        <div className="flex items-center gap-1 text-red-500 dark:text-red-400 text-xs mb-3"
             style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
          <AlertTriangle className="w-3 h-3" />
          <span>{stats.faultCount > 0 ? `${stats.faultCount} عطل نشط` : 'لا أعطال نشطة'}</span>
        </div>
        <div className="h-10"><Sparkline data={FAULT_24H} color="#f97316" /></div>
      </motion.div>

    </div>
  );
}
