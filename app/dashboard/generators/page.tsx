'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Filter } from 'lucide-react';
import { GENERATORS, STATUS_LABEL, STATUS_COLOR, STATUS_BG, type GeneratorStatus } from '@/data/generators';

const PAGE_SIZE = 20;
const ALL_STATUSES: GeneratorStatus[] = ['online-grid', 'online-gen', 'fault', 'offline'];

export default function GeneratorsPage() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<GeneratorStatus | 'all'>('all');
  const [page, setPage]               = useState(1);

  const filtered = useMemo(() => {
    let items = GENERATORS;
    if (statusFilter !== 'all') items = items.filter((g) => g.status === statusFilter);
    if (search) {
      const q = search.trim();
      items = items.filter((g) => String(g.id).includes(q) || g.area.includes(q));
    }
    return items;
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    all:    GENERATORS.length,
    grid:   GENERATORS.filter((g) => g.status === 'online-grid').length,
    gen:    GENERATORS.filter((g) => g.status === 'online-gen').length,
    fault:  GENERATORS.filter((g) => g.status === 'fault').length,
    offline:GENERATORS.filter((g) => g.status === 'offline').length,
  };

  const handleFilterChange = (v: GeneratorStatus | 'all') => {
    setStatusFilter(v);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            قائمة المولدات
          </h1>
          <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            الرمادي — محافظة الأنبار • {GENERATORS.length} مولد مسجل
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', fontFamily: 'var(--font-ibm-arabic)' }}
        >
          <Plus className="w-4 h-4" />
          إضافة مولد
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'الإجمالي',   value: counts.all,    color: '#9ca3af' },
          { label: 'شبكة وطنية', value: counts.grid,   color: '#10b981' },
          { label: 'مولد نشط',   value: counts.gen,    color: '#3b82f6' },
          { label: 'عطل',         value: counts.fault,  color: '#f97316' },
          { label: 'غير متصل',   value: counts.offline,color: '#ef4444' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-3">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-600 mt-0.5" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 text-gray-600" />
          <input
            type="text"
            placeholder="بحث برقم المولد أو اسم الحي..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full px-4 py-2 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'var(--font-ibm-arabic)' }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-gray-600 flex-shrink-0" />
          <div className="flex items-center gap-1 glass-card p-1">
            <button
              onClick={() => handleFilterChange('all')}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{
                fontFamily: 'var(--font-ibm-arabic)',
                background: statusFilter === 'all' ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: statusFilter === 'all' ? 'white' : '#6b7280',
              }}
            >
              الكل
            </button>
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleFilterChange(s)}
                className="px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap"
                style={{
                  fontFamily: 'var(--font-ibm-arabic)',
                  background: statusFilter === s ? STATUS_BG[s] : 'transparent',
                  color: statusFilter === s ? STATUS_COLOR[s] : '#6b7280',
                }}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['الرقم', 'الحي', 'الحالة', 'القدرة (KW)', 'ساعات التشغيل', 'الإجراءات'].map((h) => (
                  <th
                    key={h}
                    className="text-start px-4 py-3 text-xs text-gray-500 font-medium whitespace-nowrap"
                    style={{ fontFamily: 'var(--font-ibm-arabic)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((gen, i) => (
                <motion.tr
                  key={gen.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.015 }}
                  className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-sm text-gray-300">
                      G-{String(gen.id).padStart(4, '0')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                    {gen.area}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                      style={{
                        background: STATUS_BG[gen.status],
                        color: STATUS_COLOR[gen.status],
                        fontFamily: 'var(--font-ibm-arabic)',
                      }}
                    >
                      {STATUS_LABEL[gen.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-gray-400">{gen.power}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {gen.hours.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      className="px-2.5 py-1 rounded-lg text-xs transition-colors text-gray-500 hover:text-white hover:bg-white/10"
                      style={{ fontFamily: 'var(--font-ibm-arabic)' }}
                    >
                      عرض
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
          <span className="text-xs text-gray-600" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            عرض {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} من {filtered.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ fontFamily: 'var(--font-ibm-arabic)' }}
            >
              السابق
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.min(Math.max(page - 2, 1) + i, totalPages);
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="w-8 h-8 rounded-lg text-xs transition-colors"
                  style={{
                    background: p === page ? 'rgba(16,185,129,0.15)' : 'transparent',
                    color: p === page ? '#10b981' : '#6b7280',
                    border: p === page ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
                  }}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ fontFamily: 'var(--font-ibm-arabic)' }}
            >
              التالي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
