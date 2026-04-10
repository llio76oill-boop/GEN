'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Zap, Activity, Clock, BarChart3 } from 'lucide-react';


type Range = '24h' | '7d' | '30d';

// Static sparkline data for each range (power MW)
const DATA: Record<Range, number[]> = {
  '24h': [420,380,350,310,290,280,310,380,450,520,580,620,640,630,610,590,560,600,640,665,650,620,580,540],
  '7d':  [3200,3100,3400,3600,3300,3500,3800],
  '30d': [3000,3100,3200,3400,3300,3500,3600,3400,3700,3800,3600,3900,4000,3800,4100,4200,4000,4300,4100,4200,4400,4300,4500,4200,4400,4300,4500,4600,4400,4500],
};

const LABELS: Record<Range, string> = { '24h': '24 ساعة', '7d': '7 أيام', '30d': '30 يوم' };

function MiniChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - ((v - min) / range) * 78 - 11,
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fill = `${line} L ${pts[pts.length - 1].x} 100 L 0 100 Z`;
  const id = `ag-${color.replace('#', '')}`;
  return (
    <svg viewBox="0 0 100 60" className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0"   />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${id})`} />
      <motion.path d={line} fill="none" stroke={color} strokeWidth="2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />
    </svg>
  );
}

// Area stats will be loaded from DB — empty until real data arrives
const areaStats: { name: string; total: number; online: number }[] = [];

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>('24h');
  const data = DATA[range];
  const latest = data[data.length - 1];
  const prev   = data[data.length - 2];
  const pct    = Math.round(((latest - prev) / prev) * 100);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>تحليلات الطاقة</h1>
          <p className="text-sm text-[var(--text-4)] mt-0.5" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>بيانات الشبكة الكهربائية — الرمادي</p>
        </div>
        <div className="flex items-center gap-1 glass-card p-1">
          {(['24h', '7d', '30d'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1.5 rounded-lg text-sm transition-all"
              style={{
                background: range === r ? 'rgba(16,185,129,0.15)' : 'transparent',
                color: range === r ? '#10b981' : 'var(--text-4)',
                fontFamily: 'var(--font-ibm-arabic)',
              }}
            >
              {LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Zap,      label: 'إجمالي الإنتاج',   value: `${latest} MW`,  color: '#10b981', trend: pct },
          { icon: Activity, label: 'المولدات النشطة',   value: '—', color: '#3b82f6', trend: 2.1 },
          { icon: Clock,    label: 'الكفاءة التشغيلية', value: '91.4%',          color: '#a855f7', trend: 0.8 },
          { icon: BarChart3, label: 'ذروة اليوم',       value: `${Math.max(...data)} MW`, color: '#f97316', trend: -1.2 },
        ].map((k) => {
          const Icon = k.icon;
          const up = k.trend >= 0;
          return (
            <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${k.color}18` }}>
                  <Icon className="w-4 h-4" style={{ color: k.color }} />
                </div>
                <span className="text-xs text-[var(--text-4)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{k.label}</span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-1)] mb-1">{k.value}</p>
              <div className="flex items-center gap-1" style={{ color: up ? '#10b981' : '#ef4444' }}>
                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span className="text-xs">{up ? '+' : ''}{k.trend}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Chart */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-2)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            منحنى إنتاج الطاقة — آخر {LABELS[range]}
          </h2>
          <span className="text-xs text-[var(--text-5)]">{range === '24h' ? 'MW بالساعة' : 'MW يومياً'}</span>
        </div>
        <div className="h-40">
          <MiniChart data={data} color="#10b981" />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--text-5)] mt-1 px-1" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
          <span>{range === '24h' ? '00:00' : 'اليوم 1'}</span>
          <span>{range === '24h' ? '23:00' : `اليوم ${data.length}`}</span>
        </div>
      </div>

      {/* Area Breakdown */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-[var(--text-2)] mb-4" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
          التوزيع الجغرافي — الأحياء
        </h2>
        <div className="space-y-3">
          {areaStats.map((a) => {
            const pct = a.total > 0 ? Math.round((a.online / a.total) * 100) : 0;
            return (
              <div key={a.name} className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-3)] w-20 flex-shrink-0 text-end" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                  {a.name}
                </span>
                <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(to left, #10b981, #3b82f6)` }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                  />
                </div>
                <span className="text-xs text-[var(--text-4)] w-16 flex-shrink-0" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                  {a.online}/{a.total} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
