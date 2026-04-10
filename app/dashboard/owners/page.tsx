'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Zap, Phone, ChevronDown, ChevronUp, Search,
  Clock, Wifi, WifiOff, AlertTriangle, UserCircle, Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { STATUS_COLOR, STATUS_LABEL, STATUS_BG, type GeneratorStatus } from '@/data/generators';
import { obfuscateArabicName, formatIQD, billStatusMeta } from '@/lib/obfuscate';

/* ── DB row types ── */
type BillStatus = 'pending' | 'paid' | 'overdue';

interface Bill {
  id: number;
  month_label: string;
  amps: number;
  price_per_amp: number;
  commission: number;
  total_iqd: number;
  status: BillStatus;
  paid_at: string | null;
}

interface Subscriber {
  id: number;
  sub_code: string;
  full_name: string;
  region_id: string;
  owned_gen_id: number | null;
  amps: number;
  phone: string | null;
  active: boolean;
  bills: Bill[];
}

interface OperatorRow {
  id: number;
  name: string;
  phone: string;
  shift: 'صباحي' | 'مسائي' | 'ليلي';
  shift_start: string;
  shift_end: string;
  active: boolean;
}

interface OwnedGeneratorRow {
  id: number;
  code: string;
  area: string;
  power: number;
  status: GeneratorStatus;
  total_hours: number;
  thingspeak_channel_id: string | null;
  operators: OperatorRow[];
}

interface OwnerRow {
  id: number;
  name: string;
  phone: string;
  initials: string;
  owned_since: string;
  owned_generators: OwnedGeneratorRow[];
}

/* ── Status icon ── */
function StatusIcon({ status }: { status: GeneratorStatus }) {
  if (status === 'online-grid' || status === 'online-gen')
    return <Wifi className="w-3.5 h-3.5" style={{ color: STATUS_COLOR[status] }} />;
  if (status === 'fault')
    return <AlertTriangle className="w-3.5 h-3.5" style={{ color: STATUS_COLOR[status] }} />;
  return <WifiOff className="w-3.5 h-3.5" style={{ color: STATUS_COLOR[status] }} />;
}

/* ── Shift badge ── */
function ShiftBadge({ shift }: { shift: OperatorRow['shift'] }) {
  const cfg = {
    'صباحي': { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
    'مسائي': { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
    'ليلي':  { bg: 'rgba(168,85,247,0.12)', color: '#a855f7' },
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

/* ── Subscribers panel ── */
function SubscribersPanel({ subs, loading }: { subs: Subscriber[] | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-5)' }} />
      </div>
    );
  }
  if (!subs || subs.length === 0) {
    return (
      <div className="py-6 text-center">
        <UserCircle className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: 'var(--text-5)' }} />
        <p className="text-sm" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
          لا توجد مشتركين مرتبطين
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {subs.map((sub) => {
        const latestBill = sub.bills.length
          ? [...sub.bills].sort((a, b) => b.month_label.localeCompare(a.month_label))[0]
          : null;
        const meta = latestBill ? billStatusMeta(latestBill.status) : null;
        return (
          <div
            key={sub.id}
            className="flex flex-wrap items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
          >
            <span
              className="text-xs font-mono font-bold flex-shrink-0"
              style={{ color: '#a78bfa' }}
              dir="ltr"
            >
              {sub.sub_code}
            </span>
            <span
              className="flex-1 min-w-0 text-xs truncate"
              style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}
            >
              {obfuscateArabicName(sub.full_name)}
            </span>
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-4)' }}>
              {sub.amps} A
            </span>
            {meta && latestBill ? (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: meta.bg, color: meta.color, fontFamily: 'var(--font-ibm-arabic)' }}
                >
                  {meta.label}
                </span>
                <span className="text-xs font-medium" style={{ color: meta.color }}>
                  {formatIQD(latestBill.total_iqd)}
                </span>
              </div>
            ) : (
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                لا توجد فاتورة
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Single generator card with collapsible operator roster ── */
function GeneratorCard({ gen }: { gen: OwnedGeneratorRow }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border-normal)', background: 'var(--bg-card)' }}
    >
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
            <span
              className="text-sm font-bold"
              style={{ color: 'var(--text-1)', fontFamily: 'var(--font-sans)' }}
              dir="ltr"
            >
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

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div
              className="px-4 pb-4 space-y-2"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <p
                className="text-[10px] font-semibold pt-3 mb-2 uppercase tracking-wide"
                style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}
              >
                سجل المشغلين
              </p>
              {gen.operators.length === 0 && (
                <p
                  className="text-xs text-center py-2"
                  style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}
                >
                  لا يوجد مشغلون مسجلون
                </p>
              )}
              {gen.operators.map((op) => (
                <div
                  key={op.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: op.active ? 'rgba(16,185,129,0.05)' : 'var(--surface)',
                    border: `1px solid ${op.active ? 'rgba(16,185,129,0.18)' : 'var(--border-subtle)'}`,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: op.active ? '#10b981' : 'var(--text-5)',
                      boxShadow: op.active ? '0 0 6px rgba(16,185,129,0.6)' : 'none',
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs font-medium"
                        style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}
                      >
                        {op.name}
                      </span>
                      <ShiftBadge shift={op.shift} />
                      {op.active && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontFamily: 'var(--font-ibm-arabic)' }}
                        >
                          على المناوبة
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-2.5 h-2.5" style={{ color: 'var(--text-5)' }} />
                      <span className="text-[10px]" style={{ color: 'var(--text-5)' }} dir="ltr">
                        {op.shift_start} – {op.shift_end}
                      </span>
                    </div>
                  </div>
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
                    <span className="text-xs font-medium hidden sm:inline" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                      اتصل
                    </span>
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
function OwnerCard({ owner }: { owner: OwnerRow }) {
  const [expanded, setExpanded]       = useState(true);
  const [showSubs, setShowSubs]       = useState(false);
  const [subs, setSubs]               = useState<Subscriber[] | null>(null);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const hasFetched = useRef(false);

  const totalPower  = owner.owned_generators.reduce((s, g) => s + g.power, 0);
  const faultCount  = owner.owned_generators.filter((g) => g.status === 'fault' || g.status === 'offline').length;
  const activeCount = owner.owned_generators.filter((g) => g.status === 'online-grid' || g.status === 'online-gen').length;

  const fetchSubs = async () => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    setLoadingSubs(true);
    const ids = owner.owned_generators.map((g) => g.id);
    const { data } = await supabase
      .from('subscribers')
      .select('*, bills(*)')
      .in('owned_gen_id', ids.length ? ids : [-1])
      .order('id');
    setSubs((data as Subscriber[]) ?? []);
    setLoadingSubs(false);
  };

  const toggleSubs = () => {
    if (!showSubs) fetchSubs();
    setShowSubs((v) => !v);
  };

  return (
    <motion.div layout className="glass-card overflow-hidden">
      {/* Owner header */}
      <button
        className="w-full flex items-center gap-4 p-5 text-start"
        onClick={() => setExpanded((v) => !v)}
      >
        <div
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-purple-400/20 flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ color: '#a78bfa' }}
        >
          {owner.initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-bold mb-1"
            style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}
          >
            {owner.name}
          </h3>
          <div className="flex items-center flex-wrap gap-3">
            <span className="text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
              {owner.owned_generators.length} مولدات
            </span>
            <span className="text-xs" style={{ color: '#10b981' }}>{activeCount} نشط</span>
            {faultCount > 0 && (
              <span className="text-xs" style={{ color: '#f97316', fontFamily: 'var(--font-ibm-arabic)' }}>
                {faultCount} عطل
              </span>
            )}
            <span className="text-xs" style={{ color: 'var(--text-5)' }}>
              {totalPower.toLocaleString()} KW إجمالي
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Subscribers button */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleSubs(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
            style={{
              background: showSubs ? 'rgba(168,85,247,0.18)' : 'rgba(168,85,247,0.1)',
              border:     `1px solid ${showSubs ? 'rgba(168,85,247,0.4)' : 'rgba(168,85,247,0.2)'}`,
              color:      '#a78bfa',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden md:inline">عرض المشتركين</span>
          </button>
          {/* Phone */}
          <a
            href={`tel:${owner.phone.replace(/\s/g, '')}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
            style={{
              background: 'rgba(59,130,246,0.1)',
              border:     '1px solid rgba(59,130,246,0.2)',
              color:      '#3b82f6',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">اتصل بالمالك</span>
          </a>
          {expanded
            ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-5)' }} />
            : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-5)' }} />}
        </div>
      </button>

      {/* Subscribers panel */}
      <AnimatePresence initial={false}>
        {showSubs && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div
              className="px-5 pb-5"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <p
                className="text-[10px] font-semibold pt-4 pb-3 uppercase tracking-wide"
                style={{ color: '#a78bfa', fontFamily: 'var(--font-ibm-arabic)' }}
              >
                المشتركون والفواتير
              </p>
              <SubscribersPanel subs={subs} loading={loadingSubs} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generators list */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.24 }}
            className="overflow-hidden"
          >
            <div
              className="px-5 pb-5 space-y-3"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <p
                className="text-[10px] font-semibold pt-4 uppercase tracking-wide"
                style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}
              >
                المولدات المملوكة
              </p>
              {owner.owned_generators.map((gen) => (
                <GeneratorCard key={gen.id} gen={gen} />
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
  const [owners, setOwners]   = useState<OwnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    supabase
      .from('owners')
      .select('*, owned_generators(*, operators(*))')
      .neq('is_mock', true)
      .order('id')
      .then(({ data }) => {
        setOwners((data as OwnerRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return owners;
    return owners.filter(
      (o) =>
        o.name.includes(q) ||
        o.owned_generators.some(
          (g) => g.code.toLowerCase().includes(q) || g.area.includes(q),
        ),
    );
  }, [search, owners]);

  const totalGens = owners.reduce((s, o) => s + o.owned_generators.length, 0);
  const totalOps  = owners.reduce(
    (s, o) => s + o.owned_generators.reduce((ss, g) => ss + g.operators.length, 0),
    0,
  );
  const onDuty = owners.reduce(
    (s, o) =>
      s + o.owned_generators.reduce(
        (ss, g) => ss + g.operators.filter((op) => op.active).length,
        0,
      ),
    0,
  );
  const faults = owners.reduce(
    (s, o) =>
      s + o.owned_generators.filter((g) => g.status === 'fault' || g.status === 'offline').length,
    0,
  );

  const STATS = [
    { label: 'أصحاب المولدات', value: owners.length, color: '#a78bfa' },
    { label: 'إجمالي المولدات', value: totalGens,     color: '#10b981' },
    { label: 'المشغلون الكلي',  value: totalOps,      color: '#3b82f6' },
    { label: 'على المناوبة',    value: onDuty,        color: '#10b981' },
    { label: 'مولدات معطلة',   value: faults,        color: faults > 0 ? '#f97316' : '#10b981' },
  ];

  return (
    <div className="space-y-5 max-w-3xl" dir="rtl">
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
            {loading ? (
              <div className="h-7 w-6 mx-auto rounded animate-pulse" style={{ background: 'var(--border-normal)' }} />
            ) : (
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            )}
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
              {s.label}
            </p>
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

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--text-5)' }} />
        </div>
      )}

      {!loading && (
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
                {search ? 'لا توجد نتائج مطابقة' : 'لا توجد بيانات مسجلة'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
