'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Clock, Zap, MapPin, AlertTriangle, Activity,
  Users, ArrowLeft,
} from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';

/* ── Tiny arc gauge ── */
function MiniGauge({ pct, color, size = 48 }: { pct: number; color: string; size?: number }) {
  const r = size * 0.38;
  const cx = size / 2, cy = size / 2;
  const sx = cx - r, sy = cy;
  const ang = 180 * pct;
  const ex = cx + Math.cos(((ang - 180) * Math.PI) / 180) * r;
  const ey = cy + Math.sin(((ang - 180) * Math.PI) / 180) * r;
  const la = ang > 180 ? 1 : 0;
  return (
    <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`}>
      <path
        d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" strokeLinecap="round"
      />
      <motion.path
        d={`M ${sx} ${sy} A ${r} ${r} 0 ${la} 1 ${ex} ${ey}`}
        fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
      />
    </svg>
  );
}

export default function ProgramOutputs() {
  const { stats } = useDashboardStats();

  const totalPowerMW  = Math.round(stats.totalPowerKW  / 1000 * 10) / 10;
  const onlinePowerMW = Math.round(stats.onlinePowerKW / 1000 * 10) / 10;
  const consumedMW    = Math.round(onlinePowerMW * 0.74 * 10) / 10;
  const consumedPct   = onlinePowerMW > 0 ? 0.74 : 0;
  const faultCount    = stats.faultCount + stats.offlineCount;

  const outputs = [
    {
      id: 'gen-hours',
      icon: Clock,
      title: 'ساعات تشغيل المولدات',
      description: 'متوسط ساعات التشغيل لكافة المولدات المسجلة',
      value: stats.avgHours.toLocaleString(),
      unit: 'ساعة',
      sub: `إجمالي ${stats.totalGenerators} مولد مسجل`,
      color: '#3b82f6',
      href: '/dashboard/generators/',
    },
    {
      id: 'operators',
      icon: Users,
      title: 'المشغلون المسجلون',
      description: 'إجمالي المشغلين المسجلين في المنظومة',
      value: stats.totalOperators.toLocaleString(),
      unit: 'مشغل',
      sub: `موزعون على ${stats.totalGenerators} مولد`,
      color: '#a855f7',
      href: '/dashboard/owners/',
    },
    {
      id: 'geo',
      icon: MapPin,
      title: 'الموقع الجغرافي',
      description: 'مواقع المولدات على الخريطة التفاعلية',
      value: stats.totalAreas.toString(),
      unit: 'حي / منطقة',
      sub: `${stats.totalGenerators} موقع مرسوم على الخريطة`,
      color: '#a855f7',
      href: '/dashboard/map/',
    },
    {
      id: 'faults',
      icon: AlertTriangle,
      title: 'الأعطال المباشرة',
      description: 'المولدات المتعطلة وغير المتصلة حالياً',
      value: faultCount.toString(),
      unit: 'عطل نشط',
      sub: 'مراقبة فورية على مدار الساعة',
      color: '#f97316',
      href: '/dashboard/faults/',
    },
    {
      id: 'energy',
      icon: Activity,
      title: 'الطاقة المنتجة والمستهلكة',
      description: 'إجمالي الإنتاج مقابل الاستهلاك',
      value: `${onlinePowerMW || totalPowerMW}`,
      unit: 'MW منتجة',
      sub: `${consumedMW} MW مستهلكة (${Math.round(consumedPct * 100)}%)`,
      color: '#10b981',
      href: '/dashboard/analytics/',
      gauge: consumedPct,
    },
  ];

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 rounded-full bg-emerald-500" />
        <h2
          className="text-sm font-bold"
          style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}
        >
          مخرجات البرنامج
        </h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
          5 مخرجات رئيسية
        </span>
      </div>

      {/* Output cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {outputs.map((out, i) => {
          const Icon = out.icon;
          return (
            <motion.div
              key={out.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i }}
            >
              <Link href={out.href} prefetch={false} className="block h-full">
                <div
                  className="glass-card p-4 h-full flex flex-col justify-between group hover:border-emerald-500/20 transition-all cursor-pointer"
                >
                  {/* Icon + Title */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: `${out.color}15` }}
                      >
                        <Icon className="w-[18px] h-[18px]" style={{ color: out.color }} />
                      </div>
                      <ArrowLeft
                        className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity -translate-x-1 group-hover:translate-x-0"
                        style={{ color: 'var(--text-4)', transitionDuration: '200ms' }}
                      />
                    </div>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>
                      {out.title}
                    </p>
                    <p className="text-[10px] leading-relaxed mb-3" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                      {out.description}
                    </p>
                  </div>

                  {/* Value */}
                  <div>
                    {out.gauge && (
                      <div className="flex justify-center mb-1">
                        <MiniGauge pct={out.gauge} color={out.color} />
                      </div>
                    )}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold" style={{ color: out.color }}>
                        {out.value}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                        {out.unit}
                      </span>
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                      {out.sub}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
