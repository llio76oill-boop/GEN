'use client';

import dynamic from 'next/dynamic';
import { Signal } from 'lucide-react';
import { GENERATORS } from '@/data/generators';

const LeafletMap = dynamic(() => import('@/components/dashboard/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0d0d1a]">
      <div
        className="w-12 h-12 rounded-full border-2 border-white/10 border-t-emerald-400"
        style={{ animation: 'spin 0.9s linear infinite' }}
      />
    </div>
  ),
});

const STAT_CONFIG = [
  { key: 'online-grid' as const, label: 'شبكة وطنية', color: '#10b981' },
  { key: 'online-gen'  as const, label: 'مولد نشط',   color: '#3b82f6' },
  { key: 'fault'       as const, label: 'عطل',          color: '#f97316' },
  { key: 'offline'     as const, label: 'غير متصل',    color: '#ef4444' },
];

export default function MapPage() {
  const stats = STAT_CONFIG.map((s) => ({
    ...s,
    value: GENERATORS.filter((g) => g.status === s.key).length,
  }));

  return (
    <div className="flex flex-col gap-3" style={{ height: 'calc(100vh - 9rem - env(safe-area-inset-bottom, 0px))' }}>
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
        {stats.map((s) => (
          <div
            key={s.key}
            className="glass-card p-4 flex items-center gap-3"
          >
            <span
              className="w-3 h-3 rounded-full block flex-shrink-0"
              style={{ background: s.color, boxShadow: `0 0 8px ${s.color}80` }}
            />
            <div>
              <p className="text-2xl font-bold text-white leading-none">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Full-screen Map */}
      <div
        className="relative flex-1 rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Header overlay */}
        <div
          className="absolute top-0 inset-x-0 flex items-center gap-2 p-3 pointer-events-none"
          style={{ zIndex: 1001 }}
        >
          <div
            className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl"
            style={{ background: 'rgba(6,6,14,0.88)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Signal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs sm:text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
              خريطة الرمادي التفاعلية
            </span>
            <span className="text-xs text-gray-500 hidden sm:inline">300 مولد مرسوم • انقر لمزيد من التفاصيل</span>
          </div>
        </div>

        <div className="absolute inset-0">
          <LeafletMap />
        </div>
      </div>
    </div>
  );
}
