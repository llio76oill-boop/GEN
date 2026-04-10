'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, RefreshCw, Save, ChevronDown, ChevronUp,
  Edit3, CheckCircle2, XCircle, AlertTriangle, Zap,
  Users, ReceiptText, TrendingUp, Search, Filter,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { obfuscateArabicName, calcBillTotal, formatIQD, billStatusMeta } from '@/lib/obfuscate';

// ── Types ─────────────────────────────────────────────────────────────────
interface RegionRow {
  id: number;
  region_id: string;
  region_name: string;
  price_per_amp: number;
  commission: number;
  updated_by: string;
  updated_at: string;
  sub_count?: number;
  pending_count?: number;
}

interface SubscriberRow {
  id: number;
  sub_code: string;
  full_name: string;
  region_id: string;
  amps: number;
  active: boolean;
}

interface BillSummary {
  subscriber_id: number;
  total_iqd: number;
  status: 'pending' | 'paid' | 'overdue';
  month_label: string;
}

// ── Small helpers ────────────────────────────────────────────────────────
function InputCell({
  value,
  onChange,
  min = 0,
  suffix = '',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        value={value}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-28 text-sm rounded-lg px-2.5 py-1.5 outline-none text-center tabular-nums"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'var(--text-1)',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
        onBlur={(e)  => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
      />
      {suffix && <span className="text-xs" style={{ color: 'var(--text-5)' }}>{suffix}</span>}
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div
      className="flex items-center gap-4 rounded-2xl p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}20`, border: `1px solid ${color}40` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--text-1)' }}>{value}</p>
        <p className="text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>{label}</p>
        {sub && <p className="text-[10px]" style={{ color: 'var(--text-5)' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Bulk Update Modal ────────────────────────────────────────────────────
function BulkUpdateModal({
  regions,
  onClose,
  onApply,
}: {
  regions: RegionRow[];
  onClose: () => void;
  onApply: (regionIds: string[], newPrice: number) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newPrice, setNewPrice] = useState(10000);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleApply = async () => {
    if (selected.size === 0 || newPrice <= 0) return;
    setSaving(true);
    await onApply([...selected], newPrice);
    setSaving(false);
    setDone(true);
    setTimeout(onClose, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        className="w-full max-w-lg rounded-3xl p-6 space-y-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>
            تحديث سعر المناطق دفعةً واحدة
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-5)' }}>
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Region checkboxes */}
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {regions.map((r) => (
            <label
              key={r.region_id}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-colors"
              style={{
                background: selected.has(r.region_id) ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selected.has(r.region_id) ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'}`,
              }}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(r.region_id)}
                  onChange={() => toggle(r.region_id)}
                  className="w-4 h-4 accent-emerald-400"
                />
                <span className="text-xs font-mono font-bold" style={{ color: '#10b981' }}>{r.region_id}</span>
                <span className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>{r.region_name}</span>
              </div>
              <span className="text-xs tabular-nums" style={{ color: 'var(--text-4)' }}>
                {r.price_per_amp.toLocaleString('ar-IQ')} د.ع.
              </span>
            </label>
          ))}
        </div>

        {/* New price input */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
            السعر الجديد لكل أمبير (د.ع.)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={newPrice}
              min={1000}
              step={500}
              onChange={(e) => setNewPrice(Number(e.target.value))}
              className="flex-1 rounded-xl px-4 py-3 text-lg font-bold tabular-nums text-center outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-1)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
              onBlur={(e)  => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
            <span className="text-sm font-medium" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>د.ع. / أمبير</span>
          </div>
          {selected.size > 0 && (
            <p className="text-xs text-emerald-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
              سيتم تطبيق {newPrice.toLocaleString('ar-IQ')} د.ع. على {selected.size} منطقة
            </p>
          )}
        </div>

        {done ? (
          <div className="flex items-center gap-2 py-3 justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>تم التحديث بنجاح</span>
          </div>
        ) : (
          <button
            onClick={handleApply}
            disabled={selected.size === 0 || saving}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-all"
            style={{
              background: selected.size > 0 ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--surface)',
              color:      selected.size > 0 ? 'white' : 'var(--text-5)',
              cursor:     selected.size > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            تطبيق التعديل على {selected.size} منطقة
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function BillingHubPage() {
  const [regions, setRegions]         = useState<RegionRow[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
  const [bills, setBills]             = useState<BillSummary[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState<Record<string, boolean>>({});
  const [edits, setEdits]             = useState<Record<string, { price: number; commission: number }>>({});
  const [savedIds, setSavedIds]       = useState<Set<string>>(new Set());
  const [filter, setFilter]           = useState('');
  const [showBulk, setShowBulk]       = useState(false);
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());

  // ── Fetch all data ─────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [regRes, subRes, billRes] = await Promise.all([
      supabase.from('regions_pricing').select('*').order('region_id'),
      supabase.from('subscribers').select('id, sub_code, full_name, region_id, amps, active').order('sub_code'),
      supabase
        .from('bills')
        .select('subscriber_id, total_iqd, status, month_label')
        .eq('month_label', new Date().toISOString().slice(0, 7)),
    ]);
    if (regRes.data)  setRegions(regRes.data);
    if (subRes.data)  setSubscribers(subRes.data);
    if (billRes.data) setBills(billRes.data as BillSummary[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Realtime: bills table ──────────────────────────────────────────────
  useEffect(() => {
    const chan = supabase
      .channel('billing-hub-bills')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regions_pricing' }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [fetchAll]);

  // ── Handle inline price edit ──────────────────────────────────────────
  const getEdit = (regionId: string, field: 'price' | 'commission', fallback: number) => {
    return edits[regionId]?.[field === 'price' ? 'price' : 'commission'] ?? fallback;
  };

  const setEdit = (regionId: string, field: 'price' | 'commission', val: number) => {
    setEdits((prev) => ({
      ...prev,
      [regionId]: {
        price:      field === 'price'      ? val : (prev[regionId]?.price      ?? regions.find(r => r.region_id === regionId)!.price_per_amp),
        commission: field === 'commission' ? val : (prev[regionId]?.commission ?? regions.find(r => r.region_id === regionId)!.commission),
      },
    }));
  };

  const saveRegion = async (r: RegionRow) => {
    const price      = edits[r.region_id]?.price      ?? r.price_per_amp;
    const commission = edits[r.region_id]?.commission ?? r.commission;
    setSaving((p) => ({ ...p, [r.region_id]: true }));
    await supabase
      .from('regions_pricing')
      .update({ price_per_amp: price, commission, updated_at: new Date().toISOString(), updated_by: 'admin' })
      .eq('region_id', r.region_id);
    setSaving((p) => ({ ...p, [r.region_id]: false }));
    setSavedIds((p) => new Set([...p, r.region_id]));
    setTimeout(() => setSavedIds((p) => { const n = new Set(p); n.delete(r.region_id); return n; }), 2500);
    setEdits((p) => { const n = { ...p }; delete n[r.region_id]; return n; });
    fetchAll();
  };

  // ── Bulk update ───────────────────────────────────────────────────────
  const handleBulkApply = async (regionIds: string[], newPrice: number) => {
    await Promise.all(
      regionIds.map((rid) =>
        supabase
          .from('regions_pricing')
          .update({ price_per_amp: newPrice, updated_at: new Date().toISOString(), updated_by: 'admin' })
          .eq('region_id', rid)
      )
    );
    fetchAll();
  };

  // ── Derived stats ─────────────────────────────────────────────────────
  const totalSubs    = subscribers.length;
  const pendingBills = bills.filter((b) => b.status === 'pending').length;
  const paidBills    = bills.filter((b) => b.status === 'paid').length;
  const totalRevenue = bills.filter((b) => b.status === 'paid').reduce((s, b) => s + b.total_iqd, 0);

  const filteredRegions = regions.filter(
    (r) =>
      r.region_id.toLowerCase().includes(filter.toLowerCase()) ||
      r.region_name.includes(filter)
  );

  const subsForRegion = (rid: string) => subscribers.filter((s) => s.region_id === rid);
  const billForSub = (subId: number) => bills.find((b) => b.subscriber_id === subId);

  return (
    <div className="space-y-6 max-w-6xl" dir="rtl">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            <DollarSign className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>
              مركز التسعير والفواتير
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
              إدارة أسعار المناطق والفواتير الشهرية
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAll}
            disabled={loading}
            className="p-2.5 rounded-xl transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-4)' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowBulk(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.3)',
              color: '#10b981',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            <Edit3 className="w-4 h-4" />
            تحديث دفعي للأسعار
          </button>
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Zap}         label="مناطق نشطة"         value={regions.length}      color="#6366f1" />
        <StatCard icon={Users}       label="المشتركون"           value={totalSubs}           color="#10b981" />
        <StatCard icon={AlertTriangle} label="فواتير بانتظار الدفع" value={pendingBills}   color="#f59e0b" />
        <StatCard icon={TrendingUp}  label="الإيرادات المحصَّلة" value={formatIQD(totalRevenue)} sub={`${paidBills} فاتورة مدفوعة`} color="#8b5cf6" />
      </div>

      {/* ── Filter toolbar ────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}
      >
        <Filter className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-5)' }} />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="بحث برمز المنطقة أو الاسم... (A1, الرمادي)"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}
          dir="rtl"
        />
        {filter && (
          <button onClick={() => setFilter('')} style={{ color: 'var(--text-5)' }}>
            <XCircle className="w-4 h-4" />
          </button>
        )}
        <span className="text-xs tabular-nums" style={{ color: 'var(--text-5)' }}>
          {filteredRegions.length} منطقة
        </span>
      </div>

      {/* ── Regions table ────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRegions.map((r) => {
            const regionSubs  = subsForRegion(r.region_id);
            const isExpanded  = expandedSubs.has(r.region_id);
            const hasEdit     = !!edits[r.region_id];
            const currentPrice = edits[r.region_id]?.price ?? r.price_per_amp;
            const currentComm  = edits[r.region_id]?.commission ?? r.commission;
            const isSaving    = saving[r.region_id];
            const isSaved     = savedIds.has(r.region_id);

            return (
              <motion.div
                key={r.region_id}
                layout
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}
              >
                {/* Region header row */}
                <div className="flex items-center gap-3 px-5 py-4 flex-wrap">
                  {/* Region badge */}
                  <span
                    className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
                  >
                    {r.region_id}
                  </span>

                  {/* Region name */}
                  <span className="text-sm font-medium flex-1 min-w-[120px]" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    {r.region_name}
                  </span>

                  {/* Price input */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>السعر/أمبير</span>
                    <InputCell
                      value={currentPrice}
                      onChange={(v) => setEdit(r.region_id, 'price', v)}
                      suffix="د.ع."
                    />
                  </div>

                  {/* Commission */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>العمولة</span>
                    <InputCell
                      value={currentComm}
                      onChange={(v) => setEdit(r.region_id, 'commission', v)}
                      suffix="د.ع."
                    />
                  </div>

                  {/* Save button */}
                  <button
                    onClick={() => saveRegion(r)}
                    disabled={!hasEdit || isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex-shrink-0"
                    style={{
                      background: isSaved
                        ? 'rgba(16,185,129,0.15)' : hasEdit
                        ? 'rgba(16,185,129,0.12)' : 'var(--surface)',
                      border: `1px solid ${isSaved ? 'rgba(16,185,129,0.4)' : hasEdit ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'}`,
                      color: isSaved ? '#10b981' : hasEdit ? '#10b981' : 'var(--text-5)',
                      cursor: hasEdit ? 'pointer' : 'not-allowed',
                      fontFamily: 'var(--font-ibm-arabic)',
                    }}
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : isSaved ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {isSaved ? 'تم الحفظ' : 'حفظ'}
                  </button>

                  {/* Expand subscribers */}
                  <button
                    onClick={() => setExpandedSubs((p) => {
                      const n = new Set(p);
                      n.has(r.region_id) ? n.delete(r.region_id) : n.add(r.region_id);
                      return n;
                    })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all flex-shrink-0"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-4)',
                      fontFamily: 'var(--font-ibm-arabic)',
                    }}
                  >
                    <Users className="w-3.5 h-3.5" />
                    {regionSubs.length} مشترك
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Subscribers list */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="border-t divide-y"
                        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}
                      >
                        {regionSubs.length === 0 ? (
                          <p className="px-6 py-4 text-sm text-center" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                            لا يوجد مشتركون في هذه المنطقة
                          </p>
                        ) : (
                          regionSubs.map((s) => {
                            const bill = billForSub(s.id);
                            const meta = bill ? billStatusMeta(bill.status) : null;
                            const total = calcBillTotal(s.amps, currentPrice, currentComm);
                            return (
                              <div
                                key={s.id}
                                className="flex items-center gap-3 px-6 py-3 flex-wrap"
                                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                              >
                                {/* Status dot */}
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ background: s.active ? '#10b981' : '#6b7280' }}
                                />
                                {/* Sub code */}
                                <span className="text-xs font-mono font-bold w-24 flex-shrink-0" style={{ color: '#10b981' }}>
                                  {s.sub_code}
                                </span>
                                {/* Obfuscated name */}
                                <span className="text-xs flex-1 min-w-[100px]" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
                                  {obfuscateArabicName(s.full_name)}
                                </span>
                                {/* Amps */}
                                <span className="text-xs tabular-nums font-mono flex-shrink-0" style={{ color: 'var(--text-4)' }}>
                                  {s.amps} أمبير
                                </span>
                                {/* Calculated bill */}
                                <span className="text-xs tabular-nums font-medium flex-shrink-0" style={{ color: 'var(--text-2)' }}>
                                  {formatIQD(total)}
                                </span>
                                {/* Bill status badge */}
                                {meta && (
                                  <span
                                    className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                                    style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40`, fontFamily: 'var(--font-ibm-arabic)' }}
                                  >
                                    {meta.label}
                                  </span>
                                )}
                                {/* Checkout link */}
                                <a
                                  href={`/dashboard/billing/checkout?sub=${encodeURIComponent(s.sub_code)}`}
                                  className="text-[10px] px-2.5 py-1 rounded-lg flex-shrink-0 transition-all"
                                  style={{
                                    background: 'rgba(16,185,129,0.08)',
                                    border: '1px solid rgba(16,185,129,0.2)',
                                    color: '#10b981',
                                    fontFamily: 'var(--font-ibm-arabic)',
                                  }}
                                >
                                  <ReceiptText className="w-3 h-3 inline me-1" />
                                  الدفع
                                </a>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {filteredRegions.length === 0 && !loading && (
            <div
              className="rounded-2xl p-12 text-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}
            >
              <Search className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-5)' }} />
              <p className="text-sm" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                لا توجد مناطق تطابق البحث
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Bulk Update modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {showBulk && (
          <BulkUpdateModal
            regions={regions}
            onClose={() => setShowBulk(false)}
            onApply={handleBulkApply}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
