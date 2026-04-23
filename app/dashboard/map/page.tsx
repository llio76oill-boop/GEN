'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import Link from 'next/link';
import { Signal, ChevronRight, ChevronLeft, MapPin } from 'lucide-react';
import { useGenerators, STATUS_COLOR, STATUS_LABEL, STATUS_BG, type GeneratorStatus } from '@/hooks/useGenerators';

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
  const { generators } = useGenerators();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filterStatus, setFilterStatus] = useState<GeneratorStatus | 'all'>('all');

  const stats = STAT_CONFIG.map((s) => ({
    ...s,
    value: generators.filter((g) => g.status === s.key).length,
  }));

  const filtered = filterStatus === 'all'
    ? generators
    : generators.filter((g) => g.status === filterStatus);

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

      {/* Map + Sidebar */}
      <div className="relative flex-1 flex gap-3 overflow-hidden">

        {/* Sidebar */}
        <div
          className="flex-shrink-0 rounded-2xl overflow-hidden flex flex-col transition-all duration-300"
          style={{
            width: sidebarOpen ? 240 : 0,
            opacity: sidebarOpen ? 1 : 0,
            pointerEvents: sidebarOpen ? 'auto' : 'none',
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* Sidebar header */}
          <div className="px-3 pt-3 pb-2 flex-shrink-0">
            <p className="text-xs font-bold text-[var(--text-2)] mb-2" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
              المولدات ({generators.length})
            </p>
            {/* Filter chips */}
            <div className="flex flex-wrap gap-1">
              {[{ key: 'all' as const, label: 'الكل', color: '#9ca3af' }, ...STAT_CONFIG].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setFilterStatus(s.key as GeneratorStatus | 'all')}
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all"
                  style={{
                    background: filterStatus === s.key ? s.color + '22' : 'transparent',
                    color: filterStatus === s.key ? s.color : 'var(--text-5)',
                    border: `1px solid ${filterStatus === s.key ? s.color + '55' : 'transparent'}`,
                    fontFamily: 'var(--font-ibm-arabic)',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-px" style={{ background: 'var(--border-subtle)' }} />
          {/* Generator list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map((gen) => (
              <Link
                key={gen.id}
                href={`/dashboard/generators/${gen.id}`}
                className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-white/[0.04] border-b"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: STATUS_COLOR[gen.status], boxShadow: `0 0 5px ${STATUS_COLOR[gen.status]}80` }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-2)] truncate" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                    {gen.area}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ background: STATUS_BG[gen.status], color: STATUS_COLOR[gen.status] }}
                    >
                      {STATUS_LABEL[gen.status]}
                    </span>
                    <span className="text-[9px] text-[var(--text-5)] font-mono">{gen.power} kW</span>
                  </div>
                </div>
                <MapPin className="w-3 h-3 flex-shrink-0 text-[var(--text-5)]" />
              </Link>
            ))}
          </div>
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
              className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl pointer-events-auto"
              style={{ background: 'rgba(6,6,14,0.88)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                title="إظهار/إخفاء القائمة"
              >
                {sidebarOpen
                  ? <ChevronLeft className="w-4 h-4 text-[var(--text-4)]" />
                  : <ChevronRight className="w-4 h-4 text-[var(--text-4)]" />
                }
              </button>
              <Signal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs sm:text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                خريطة الرمادي التفاعلية
              </span>
              <span className="text-xs text-gray-500 hidden sm:inline">{generators.length} مولد • انقر للتفاصيل</span>
            </div>
          </div>

          <div className="absolute inset-0">
            <LeafletMap />
          </div>
        </div>
      </div>
    </div>
  );
}
