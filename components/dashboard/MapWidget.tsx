'use client';

import dynamic from 'next/dynamic';
import { Layers, Maximize2, Signal } from 'lucide-react';
import { useGenerators } from '@/hooks/useGenerators';

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4"
      style={{ background: 'var(--bg-card)' }}
    >
      <div
        className="w-12 h-12 rounded-full border-2 border-white/10 border-t-emerald-400"
        style={{ animation: 'spin 0.9s linear infinite' }}
      />
      <p className="text-[var(--text-4)] text-sm" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
        جارٍ تحميل الخريطة...
      </p>
    </div>
  ),
});

const STAT_CONFIG = [
  { key: 'online-grid' as const, label: 'شبكة وطنية', color: '#10b981' },
  { key: 'online-gen'  as const, label: 'مولد نشط',   color: '#3b82f6' },
  { key: 'fault'       as const, label: 'عطل',          color: '#f97316' },
  { key: 'offline'     as const, label: 'غير متصل',    color: 'var(--text-2)' },
];

export default function MapWidget() {
  const { generators } = useGenerators();
  const stats = STAT_CONFIG.map((s) => ({
    ...s,
    value: generators.filter((g) => g.status === s.key).length,
  }));

  return (
    <div
      className="relative h-full rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border-normal)' }}
    >
      <div className="absolute inset-0">
        <LeafletMap />
      </div>

      <div
        className="absolute top-0 inset-x-0 flex items-center justify-between p-2 sm:p-3 pointer-events-none"
        style={{ zIndex: 1001 }}
      >
        <div
          className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl pointer-events-auto"
          style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-normal)' }}
        >
          <Signal className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span className="text-xs sm:text-sm font-semibold text-[var(--text-1)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            الرمادي - محافظة الأنبار
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse block hidden sm:block" />
          <span className="text-xs text-[var(--text-4)] hidden sm:inline">مباشر</span>
        </div>
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {[{ icon: Layers, title: 'الطبقات' }, { icon: Maximize2, title: 'تكبير' }].map(({ icon: Icon, title }) => (
            <button
              key={title} title={title}
              className="p-2 rounded-xl hover:bg-[var(--border-subtle)] transition-colors"
              style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-normal)' }}
            >
              <Icon className="w-4 h-4 text-[var(--text-3)]" />
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-3 pointer-events-none" style={{ zIndex: 1001 }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stats.map((s) => (
            <div
              key={s.key}
              className="rounded-xl p-2.5 text-center"
              style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid var(--border-normal)' }}
            >
              <p className="text-lg font-bold leading-none mb-0.5" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-[var(--text-4)] leading-none" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}













