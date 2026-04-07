'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, WifiOff, Thermometer, Zap, Search, RefreshCw, Phone, CheckCircle2, ChevronDown } from 'lucide-react';
import { GENERATORS, STATUS_COLOR, getFaultType } from '@/data/generators';

type FilterKey = 'all' | 'critical' | 'warning' | 'info';

const ICONS = [WifiOff, Thermometer, Zap, AlertTriangle, RefreshCw];
const PRIORITY_BY_POWER = (p: number) => p > 300 ? 'critical' : p > 150 ? 'warning' : 'info';

const PRIORITY_CFG = {
  critical: { label: 'حرج',    bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   text: '#ef4444' },
  warning:  { label: 'تحذير',  bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)', text: '#f97316' },
  info:     { label: 'عادي',   bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)',  text: '#3b82f6' },
};

export default function FaultsPage() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [resolved, setResolved] = useState<Set<number>>(new Set());

  const faults = useMemo(() =>
    GENERATORS
      .filter((g) => g.status === 'fault' || g.status === 'offline')
      .map((g) => ({
        ...g,
        faultType: getFaultType(g.id),
        priority: PRIORITY_BY_POWER(g.power),
        Icon: ICONS[g.id % ICONS.length],
      })),
    []
  );

  const filtered = faults.filter((f) => {
    if (resolved.has(f.id)) return false;
    if (filter !== 'all' && f.priority !== filter) return false;
    if (search && !f.area.includes(search) && !String(f.id).includes(search)) return false;
    return true;
  });

  const counts = {
    all:      faults.filter((f) => !resolved.has(f.id)).length,
    critical: faults.filter((f) => !resolved.has(f.id) && f.priority === 'critical').length,
    warning:  faults.filter((f) => !resolved.has(f.id) && f.priority === 'warning').length,
    info:     faults.filter((f) => !resolved.has(f.id) && f.priority === 'info').length,
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>مركز الأعطال</h1>
          <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            إدارة ومتابعة أعطال مولدات الرمادي في الوقت الحقيقي
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse block" />
          <span className="text-sm text-red-400 font-medium" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            {counts.all} عطل نشط
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الأعطال', value: faults.length,    color: '#9ca3af' },
          { label: 'حرجة',           value: counts.critical, color: '#ef4444' },
          { label: 'تحذيرية',        value: counts.warning,  color: '#f97316' },
          { label: 'تم الحل',        value: resolved.size,  color: '#10b981' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 glass-card p-1 flex-shrink-0">
          {([['all','الكل'], ['critical','حرجة'], ['warning','تحذيرية'], ['info','عادية']] as [FilterKey, string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className="px-3 py-1.5 rounded-lg text-sm transition-all"
              style={{
                fontFamily: 'var(--font-ibm-arabic)',
                background: filter === k ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: filter === k ? 'white' : '#6b7280',
              }}
            >
              {l}{' '}
              <span className="text-xs opacity-70">({counts[k]})</span>
            </button>
          ))}
        </div>
        <div className="flex-1 relative min-w-48">
          <Search className="absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 text-gray-600" />
          <input
            type="text"
            placeholder="بحث بالرقم أو الحي..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'var(--font-ibm-arabic)' }}
          />
        </div>
      </div>

      {/* Fault Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['رقم المولد', 'الحي', 'نوع العطل', 'الأولوية', 'القدرة KW', 'الإجراءات'].map((h) => (
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
              {filtered.slice(0, 40).map((f, idx) => {
                const cfg = PRIORITY_CFG[f.priority as keyof typeof PRIORITY_CFG];
                const Icon = f.Icon;
                return (
                  <motion.tr
                    key={f.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.018 }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${STATUS_COLOR[f.status]}18` }}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: STATUS_COLOR[f.status] }} />
                        </div>
                        <span className="font-mono text-white font-medium">
                          G-{String(f.id).padStart(4, '0')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                      {f.area}
                    </td>
                    <td className="px-4 py-3 text-gray-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                      {f.faultType}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text, fontFamily: 'var(--font-ibm-arabic)' }}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono">{f.power}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-600 hover:text-white"
                          title="تشخيص"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-600 hover:text-white"
                          title="تواصل"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setResolved((p) => new Set(p).add(f.id))}
                          className="p-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors text-gray-600 hover:text-emerald-400"
                          title="تم الحل"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-gray-600" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
              لا توجد نتائج
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
