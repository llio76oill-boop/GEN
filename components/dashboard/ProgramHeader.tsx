'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, MapPin, Users, Building2, AlertTriangle } from 'lucide-react';
import { GENERATORS, RAMADI_AREAS } from '@/data/generators';
import { OWNERS } from '@/data/owners';

export default function ProgramHeader() {
  const stats = useMemo(() => {
    const totalOps = OWNERS.reduce(
      (s, o) => s + o.generators.reduce((ss, g) => ss + g.operators.length, 0), 0
    );
    const faults = GENERATORS.filter((g) => g.status === 'fault' || g.status === 'offline').length;
    const online = GENERATORS.filter((g) => g.status === 'online-grid' || g.status === 'online-gen').length;
    return { totalOps, faults, online };
  }, []);

  const badges = [
    { icon: Zap,             label: 'مولد مسجل',       value: GENERATORS.length, color: '#10b981' },
    { icon: Building2,       label: 'قضاء / ناحية',    value: RAMADI_AREAS.length, color: '#3b82f6' },
    { icon: Users,           label: 'مشغل مسجل',       value: stats.totalOps, color: '#a855f7' },
    { icon: AlertTriangle,   label: 'عطل نشط',         value: stats.faults, color: '#f97316' },
  ];

  return (
    <div
      className="rounded-2xl p-4 sm:p-5"
      style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(59,130,246,0.04))',
        border: '1px solid var(--border-normal)',
      }}
    >
      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1
              className="text-base sm:text-lg font-bold leading-tight"
              style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}
            >
              برنامج متابعة تشغيل المولدات الأهلية
            </h1>
            <p
              className="text-[11px] sm:text-xs mt-0.5"
              style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}
            >
              تثبيت معلومات كافة مشغلي المولدات — محافظة الأنبار
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse block" />
          <span
            className="text-[11px] font-medium"
            style={{ color: '#10b981', fontFamily: 'var(--font-ibm-arabic)' }}
          >
            {stats.online} متصل الآن
          </span>
        </div>
      </div>

      {/* Summary badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {badges.map((b, i) => {
          const Icon = b.icon;
          return (
            <motion.div
              key={b.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i }}
              className="flex items-center gap-2.5 rounded-xl p-2.5 sm:p-3"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${b.color}12` }}
              >
                <Icon className="w-4 h-4" style={{ color: b.color }} />
              </div>
              <div>
                <p className="text-lg font-bold leading-none" style={{ color: b.color }}>
                  {b.value.toLocaleString('ar-EG')}
                </p>
                <p
                  className="text-[10px] mt-0.5"
                  style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}
                >
                  {b.label}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
