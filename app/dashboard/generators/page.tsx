'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Search, Plus, Filter } from 'lucide-react';
import { useGenerators, STATUS_LABEL, STATUS_COLOR, STATUS_BG, type GeneratorStatus } from '@/hooks/useGenerators';
import SyncThingSpeakButton from '@/components/dashboard/SyncThingSpeakButton';

const PAGE_SIZE = 20;
const ALL_STATUSES: GeneratorStatus[] = ['online-grid', 'online-gen', 'fault', 'offline'];

export default function GeneratorsPage() {
  const { generators, loading } = useGenerators();
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<GeneratorStatus | 'all'>('all');
  const [page, setPage]                 = useState(1);

  const filtered = useMemo(() => {
    let items = generators;
    if (statusFilter !== 'all') items = items.filter((g) => g.status === statusFilter);
    if (search) {
      const q = search.trim();
      items = items.filter((g) => String(g.id).includes(q) || g.area.includes(q));
    }
    return items;
  }, [generators, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    all:     generators.length,
    grid:    generators.filter((g) => g.status === 'online-grid').length,
    gen:     generators.filter((g) => g.status === 'online-gen').length,
    fault:   generators.filter((g) => g.status === 'fault').length,
    offline: generators.filter((g) => g.status === 'offline').length,
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
          <h1 className="text-xl font-bold text-[var(--text-1)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            قائمة المولدات
          </h1>
          <p className="text-sm text-[var(--text-4)] mt-0.5" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            الرمادي — محافظة الأنبار • {generators.length} مولد مسجل
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SyncThingSpeakButton onSynced={() => window.location.reload()} />
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-1)] transition-colors"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', fontFamily: 'var(--font-ibm-arabic)' }}
          >
            <Plus className="w-4 h-4" />
            إضافة مولد
          </button>
        </div>
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
            <p className="text-xs text-[var(--text-5)] mt-0.5" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 text-[var(--text-5)]" />
          <input
            type="text"
            placeholder="بحث برقم المولد أو اسم الحي..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full px-4 py-2 rounded-xl text-sm text-[var(--text-1)] placeholder-[var(--text-5)] outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'var(--font-ibm-arabic)' }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-[var(--text-5)] flex-shrink-0" />
          <div className="flex items-center gap-1 glass-card p-1">
            <button
              onClick={() => handleFilterChange('all')}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{
                fontFamily: 'var(--font-ibm-arabic)',
                background: statusFilter === 'all' ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: statusFilter === 'all' ? 'var(--text-1)' : 'var(--text-4)',
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
                  color: statusFilter === s ? STATUS_COLOR[s] : 'var(--text-4)',
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
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-[var(--text-4)] border-t-transparent animate-spin" />
          </div>
        )}
        {!loading && paged.length === 0 && (
          <p className="text-center text-[var(--text-4)] py-16 text-sm" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            لا توجد مولدات تطابق البحث
          </p>
        )}
        {!loading && paged.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['الرقم', 'الحي', 'الحالة', 'القدرة (KW)', 'ساعات التشغيل', 'الإجراءات'].map((h) => (
                  <th
                    key={h}
                    className="text-start px-4 py-3 text-xs text-[var(--text-4)] font-medium whitespace-nowrap"
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
                    <span className="font-mono text-sm text-[var(--text-2)]">
                      G-{String(gen.id).padStart(4, '0')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-3)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
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
                  <td className="px-4 py-2.5 font-mono text-[var(--text-3)]">{gen.power}</td>
                  <td className="px-4 py-2.5 text-[var(--text-4)]">
                    {gen.hours.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/dashboard/generators/G-${String(gen.id).padStart(4, '0')}`}
                      className="px-2.5 py-1 rounded-lg text-xs transition-colors text-[var(--text-4)] hover:text-[var(--text-1)] hover:bg-white/[0.06] inline-block"
                      style={{ fontFamily: 'var(--font-ibm-arabic)' }}
                    >
                      عرض الملف
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
          <span className="text-xs text-[var(--text-5)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            عرض {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} من {filtered.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-4)] hover:text-[var(--text-1)] hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                    color: p === page ? '#10b981' : 'var(--text-4)',
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
              className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-4)] hover:text-[var(--text-1)] hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
