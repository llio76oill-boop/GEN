'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Zap, Phone, ChevronDown, ChevronUp, Search, Clock, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { OWNERS, type Owner, type OwnedGenerator, type Operator } from '@/data/owners';
import { STATUS_COLOR, STATUS_LABEL, STATUS_BG } from '@/data/generators';

/* ── Status icon ── */
function StatusIcon({ status }: { status: OwnedGenerator['status'] }) {
  if (status === 'online-grid' || status === 'online-gen') return <Wifi className="w-3.5 h-3.5" style={{ color: STATUS_COLOR[status] }} />;
  if (status === 'fault')   return <AlertTriangle className="w-3.5 h-3.5" style={{ color: STATUS_COLOR[status] }} />;
  return <WifiOff className="w-3.5 h-3.5" style={{ color: STATUS_COLOR[status] }} />;
}

/* ── Shift badge ── */
function ShiftBadge({ shift }: { shift: Operator['shift'] }) {
  const cfg = {
    'صباحي': { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24' },
    'مسائي': { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6' },
    'ليلي':  { bg: 'rgba(168,85,247,0.12)',  color: '#a855f7' },
  }[shift];
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color, fontFamily: 'var(--font-ibm-arabic)' }}
    >
      {shift}
    </span>
  );
}

/* ── Single Generator card with collapsible operator roster ── */
function GeneratorCard({ gen }: { gen: OwnedGenerator }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border-normal)', background: 'var(--bg-card)' }}
    >
      {/* Generator header */}
      <button
        className="w-full flex items-center gap-3 p-4 text-start"
        onClick={() => setOpen((v) => !v)}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: STATUS_BG[gen.status] }}
        >
          <Zap className="w-5 h-5" style={{ color: STATUS_COLOR[gen.status] }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-sans)' }} dir="ltr">
              {gen.code}
            </span>
            <span
              className="text-[9px] px-2 py-0.5 rounded-full"
              style={{ background: STATUS_BG[gen.status], color: STATUS_COLOR[gen.status], fontFamily: 'var(--font-ibm-arabic)' }}
            >
              {STATUS_LABEL[gen.status]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
              📍 {gen.area}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-4)' }}>{gen.power} KW</span>
            <span className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
              {gen.operators.length} مشغل
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusIcon status={gen.status} />
          {open
            ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-5)' }} />
            : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-5)' }} />}
        </div>
      </button>

      {/* Operator roster */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <p
                className="text-[10px] font-semibold pt-3 mb-2 uppercase tracking-wide"
                style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}
              >
                سجل المشغلين
              </p>
              {gen.operators.map((op) => (
                <div
                  key={op.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: op.active ? 'rgba(16,185,129,0.05)' : 'var(--surface)',
                    border: `1px solid ${op.active ? 'rgba(16,185,129,0.18)' : 'var(--border-subtle)'}`,
                  }}
                >
                  {/* Active indicator */}
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: op.active ? '#10b981' : 'var(--text-5)', boxShadow: op.active ? '0 0 6px rgba(16,185,129,0.6)' : 'none' }}
                  />

                  {/* Name + shift */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>
                        {op.name}
                      </span>
                      <ShiftBadge shift={op.shift} />
                      {op.active && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontFamily: 'var(--font-ibm-arabic)' }}>
                          على المناوبة
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-2.5 h-2.5" style={{ color: 'var(--text-5)' }} />
                      <span className="text-[10px]" style={{ color: 'var(--text-5)' }} dir="ltr">
                        {op.shiftStart} – {op.shiftEnd}
                      </span>
                    </div>
                  </div>

                  {/* Phone */}
                  <a
                    href={`tel:${op.phone.replace(/\s/g, '')}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all"
                    style={{
                      background: op.active ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.12)',
                      border:     `1px solid ${op.active ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.2)'}`,
                      color:      op.active ? '#10b981' : '#3b82f6',
                    }}
                    title={op.phone}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium hidden sm:inline" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>اتصل</span>
                  </a>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Owner card ── */
function OwnerCard({ owner }: { owner: Owner }) {
  const [open, setOpen] = useState(true);

  const totalPower  = owner.generators.reduce((s, g) => s + g.power, 0);
  const faultCount  = owner.generators.filter((g) => g.status === 'fault' || g.status === 'offline').length;
  const activeCount = owner.generators.filter((g) => g.status === 'online-grid' || g.status === 'online-gen').length;

  return (
    <motion.div
      layout
      className="glass-card overflow-hidden"
    >
      {/* Owner header */}
      <button
        className="w-full flex items-center gap-4 p-5 text-start"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-purple-400/20 flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ color: '#a78bfa' }}>
          {owner.initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>
            {owner.name}
          </h3>
          <div className="flex items-center flex-wrap gap-3">
            <span className="text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
              {owner.generators.length} مولدات
            </span>
            <span className="text-xs" style={{ color: '#10b981' }}>{activeCount} نشط</span>
            {faultCount > 0 && (
              <span className="text-xs" style={{ color: '#f97316', fontFamily: 'var(--font-ibm-arabic)' }}>
                {faultCount} عطل
              </span>
            )}
            <span className="text-xs" style={{ color: 'var(--text-5)' }}>{totalPower.toLocaleString()} KW إجمالي</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <a
            href={`tel:${owner.phone.replace(/\s/g, '')}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', fontFamily: 'var(--font-ibm-arabic)' }}
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">اتصل بالمالك</span>
          </a>
          {open
            ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-5)' }} />
            : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-5)' }} />}
        </div>
      </button>

      {/* Generators list */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.24 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <p className="text-[10px] font-semibold pt-4 uppercase tracking-wide" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                المولدات المملوكة
              </p>
              {owner.generators.map((gen) => (
                <GeneratorCard key={gen.code} gen={gen} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Page ── */
export default function OwnersPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return OWNERS;
    return OWNERS.filter((o) =>
      o.name.includes(q) ||
      o.generators.some((g) => g.code.toLowerCase().includes(q) || g.area.includes(q))
    );
  }, [search]);

  /* summary stats */
  const totalGens = OWNERS.reduce((s, o) => s + o.generators.length, 0);
  const totalOps  = OWNERS.reduce((s, o) => s + o.generators.reduce((ss, g) => ss + g.operators.length, 0), 0);
  const onDuty    = OWNERS.reduce((s, o) => s + o.generators.reduce((ss, g) => ss + g.operators.filter((op) => op.active).length, 0), 0);
  const faults    = OWNERS.reduce((s, o) => s + o.generators.filter((g) => g.status === 'fault' || g.status === 'offline').length, 0);

  const STATS = [
    { label: 'أصحاب المولدات', value: OWNERS.length, color: '#a78bfa' },
    { label: 'إجمالي المولدات', value: totalGens,     color: '#10b981' },
    { label: 'المشغلون الكلي',  value: totalOps,      color: '#3b82f6' },
    { label: 'على المناوبة',    value: onDuty,        color: '#10b981' },
    { label: 'مولدات معطلة',   value: faults,        color: faults > 0 ? '#f97316' : '#10b981' },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>
          أصحاب المولدات
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
          إدارة ملاك المولدات وسجلات المشغلين وأوقات المناوبات
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}
      >
        <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-5)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم المالك أو كود المولد أو الحي..."
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}
        />
      </div>

      {/* Owner cards */}
      <div className="space-y-4">
        <AnimatePresence>
          {filtered.map((owner) => (
            <OwnerCard key={owner.id} owner={owner} />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-5)' }} />
            <p className="text-sm" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
              لا توجد نتائج مطابقة
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
