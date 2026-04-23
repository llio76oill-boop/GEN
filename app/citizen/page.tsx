'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Search, Clock, WifiOff, AlertTriangle, Send, X, CheckCircle2, ExternalLink, ReceiptText, DollarSign, Home, Briefcase, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { STATUS_COLOR, STATUS_LABEL, STATUS_BG, type GeneratorStatus } from '@/data/generators';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { obfuscateArabicName, formatIQD, billStatusMeta } from '@/lib/obfuscate';

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((m) => m.QRCodeSVG),
  { ssr: false, loading: () => <div className="w-[100px] h-[100px] bg-white/10 rounded-xl animate-pulse" /> }
);

const YEAR_HOURS = 8760;

const ISSUE_TYPES = [
  'انقطاع متكرر في الكهرباء',
  'ضعف في الجهد الكهربائي',
  'ضجيج مرتفع من المولد',
  'دخان أو رائحة كريهة',
  'عدم الاستجابة لطلبات الصيانة',
  'أخرى',
];

function pad(n: number) { return String(n).padStart(4, '0'); }

interface ReportModal {
  code: string;
  onClose: () => void;
  onSubmit: () => void;
}

function ReportModal({ code, onClose, onSubmit }: ReportModal) {
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const valid = issueType && description.trim().length >= 10;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        className="w-full max-w-md rounded-3xl p-6 space-y-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)', backdropFilter: 'blur(24px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>
              إبلاغ عن مشكلة
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
              المولد {code} — سيصل بلاغك مباشرة لمركز الأعطال
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-5)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Issue type */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
            نوع المشكلة *
          </label>
          <div className="flex flex-wrap gap-2">
            {ISSUE_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setIssueType(t)}
                className="text-xs px-3 py-1.5 rounded-xl transition-all"
                style={{
                  background: issueType === t ? 'rgba(239,68,68,0.15)' : 'var(--surface)',
                  border:     `1px solid ${issueType === t ? 'rgba(239,68,68,0.35)' : 'var(--border-subtle)'}`,
                  color:      issueType === t ? '#ef4444' : 'var(--text-3)',
                  fontFamily: 'var(--font-ibm-arabic)',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Optional name & phone */}
        <div className="grid grid-cols-2 gap-3">
          {[{ label: 'اسمك (اختياري)', val: name, set: setName, dir: 'rtl' },
            { label: 'رقم هاتفك (اختياري)', val: phone, set: setPhone, dir: 'ltr' }]
            .map(({ label, val, set, dir }) => (
              <div key={label} className="space-y-1">
                <label className="text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>{label}</label>
                <input
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  dir={dir}
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={{
                    background: 'var(--surface)',
                    border:     '1px solid var(--border-subtle)',
                    color:      'var(--text-1)',
                    fontFamily: 'var(--font-ibm-arabic)',
                  }}
                />
              </div>
            ))}
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
            وصف المشكلة * (10 أحرف على الأقل)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="اشرح المشكلة بالتفصيل..."
            className="w-full px-3 py-2 text-sm rounded-xl outline-none resize-none"
            style={{
              background: 'var(--surface)',
              border:     '1px solid var(--border-subtle)',
              color:      'var(--text-1)',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          />
          <p className="text-[10px] text-end" style={{ color: 'var(--text-5)' }}>
            {description.length} حرف
          </p>
        </div>

        {/* Submit */}
        <button
          disabled={!valid}
          onClick={onSubmit}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
          style={{
            background: valid ? 'rgba(239,68,68,0.15)' : 'var(--surface)',
            border:     `1px solid ${valid ? 'rgba(239,68,68,0.35)' : 'var(--border-subtle)'}`,
            color:      valid ? '#ef4444' : 'var(--text-5)',
            fontFamily: 'var(--font-ibm-arabic)',
            cursor:     valid ? 'pointer' : 'not-allowed',
          }}
        >
          <Send className="w-4 h-4" />
          إرسال البلاغ لمركز الأعطال
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ── Billing lookup types ── */
interface Subscriber {
  id: number; sub_code: string; full_name: string; region_id: string; amps: number;
  phone?: string; whatsapp?: string; address?: string;
  sub_type?: 'residential' | 'commercial'; active?: boolean; owned_gen_id?: number | null;
}
interface RegionPricing { region_id: string; region_name: string; price_per_amp: number; commission: number; }
interface Bill { id: number; status: string; total_iqd: number; month_label: string; amps: number; price_per_amp: number; commission: number; }
interface GenMeta { genCode: string; genArea: string; ownerName: string; }

/* ── Billing inquiry panel ── */
function BillingInquiry() {
  const [subCode, setSubCode]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [region, setRegion]       = useState<RegionPricing | null>(null);
  const [bill, setBill]           = useState<Bill | null>(null);
  const [genMeta, setGenMeta]     = useState<GenMeta | null>(null);
  const [showCard, setShowCard]   = useState(false);

  const lookup = useCallback(async () => {
    const code = subCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true); setError(''); setSubscriber(null); setRegion(null); setBill(null); setGenMeta(null); setShowCard(false);

    const { data: sub, error: subErr } = await supabase
      .from('subscribers').select('*').eq('sub_code', code).single();
    if (subErr || !sub) { setError('لم يُعثر على رمز المشترك. تحقق من الكود وأعد المحاولة.'); setLoading(false); return; }
    setSubscriber(sub);

    const [{ data: reg }, { data: bills }] = await Promise.all([
      supabase.from('regions_pricing').select('*').eq('region_id', sub.region_id).single(),
      supabase.from('bills').select('*').eq('subscriber_id', sub.id)
        .eq('month_label', new Date().toISOString().slice(0, 7)).single(),
    ]);
    setRegion(reg ?? null);
    setBill(bills ?? null);

    if (sub.owned_gen_id) {
      const { data: og } = await supabase
        .from('owned_generators')
        .select('code, area, owner_id, owners(name)')
        .eq('id', sub.owned_gen_id)
        .single() as { data: { code: string; area: string; owners: { name: string } | null } | null };
      if (og) setGenMeta({ genCode: og.code, genArea: og.area, ownerName: og.owners?.name ?? '—' });
    }

    setLoading(false);
  }, [subCode]);

  // Realtime: update bill status immediately after payment
  useEffect(() => {
    if (!bill?.id) return;
    const ch = supabase.channel(`citizen-bill-${bill.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bills', filter: `id=eq.${bill.id}` },
        (payload) => setBill((prev) => prev ? { ...prev, ...(payload.new as Bill) } : prev))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [bill?.id]);

  const statusMeta = bill ? billStatusMeta(bill.status as 'pending' | 'paid' | 'overdue') : null;
  const monthLabel = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* Sub code input */}
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
        style={{ background: 'var(--bg-card)', border: '2px solid var(--border-normal)', backdropFilter: 'blur(16px)' }}
      >
        <ReceiptText className="w-5 h-5 text-amber-400 flex-shrink-0" />
        <input
          value={subCode}
          onChange={(e) => { setSubCode(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && lookup()}
          placeholder="أدخل رمز المشترك (مثال: SUB-A1-001)"
          className="flex-1 bg-transparent outline-none text-base font-mono tracking-wider"
          style={{ color: 'var(--text-1)' }}
          dir="ltr"
        />
        {subCode && (
          <button onClick={() => { setSubCode(''); setSubscriber(null); setBill(null); setError(''); }} style={{ color: 'var(--text-5)' }}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <button
        onClick={lookup}
        disabled={!subCode.trim() || loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all"
        style={{
          background: subCode.trim() ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--surface)',
          color:      subCode.trim() ? 'white' : 'var(--text-5)',
          fontFamily: 'var(--font-ibm-arabic)',
          cursor:     subCode.trim() && !loading ? 'pointer' : 'not-allowed',
          boxShadow:  subCode.trim() ? '0 4px 20px rgba(245,158,11,0.3)' : 'none',
        }}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <DollarSign className="w-4 h-4" />
        )}
        {loading ? 'جارٍ البحث...' : 'عرض الفاتورة'}
      </button>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bill card */}
      <AnimatePresence>
        {subscriber && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-3xl p-5 space-y-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)', backdropFilter: 'blur(16px)' }}
          >
            {/* Subscriber header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold font-mono" style={{ color: 'var(--text-1)' }}>{subscriber.sub_code}</p>
                <p className="text-base font-semibold mt-0.5" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>
                  {obfuscateArabicName(subscriber.full_name)}
                </p>
                {region && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    📍 {region.region_name}
                  </p>
                )}
              </div>
              <div
                className="text-xs px-2.5 py-1.5 rounded-lg font-mono"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}
              >
                {subscriber.amps} A
              </div>
            </div>

            {/* Bill details */}
            {bill && region ? (
              <>
                <div
                  className="rounded-2xl p-4 space-y-2.5"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    <span>الشهر</span><span className="font-medium" style={{ color: 'var(--text-2)' }}>{monthLabel}</span>
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    <span>الاستهلاك</span>
                    <span className="font-medium font-mono" style={{ color: 'var(--text-2)' }}>{bill.amps} A × {bill.price_per_amp.toLocaleString('en-US')} د.ع.</span>
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    <span>عمولة الخدمة</span>
                    <span className="font-medium font-mono" style={{ color: 'var(--text-2)' }}>{bill.commission.toLocaleString('en-US')} د.ع.</span>
                  </div>
                  <div className="h-px" style={{ background: 'var(--border-subtle)' }} />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>الإجمالي</span>
                    <span className="text-lg font-bold text-amber-400">{formatIQD(bill.total_iqd)}</span>
                  </div>
                </div>

                {/* Status + pay button */}
                <div className="flex items-center gap-3">
                  {statusMeta && (
                    <span
                      className="text-xs px-3 py-1.5 rounded-xl font-semibold"
                      style={{ background: statusMeta.bg, color: statusMeta.color, fontFamily: 'var(--font-ibm-arabic)' }}
                    >
                      {statusMeta.label}
                    </span>
                  )}
                  {bill.status !== 'paid' && (
                    <Link href={`/dashboard/billing/checkout?sub=${subscriber.sub_code}`} className="flex-1">
                      <button
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                        style={{
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: 'white',
                          fontFamily: 'var(--font-ibm-arabic)',
                          boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
                        }}
                      >
                        <DollarSign className="w-4 h-4" />
                        ادفع الآن
                      </button>
                    </Link>
                  )}
                  {bill.status === 'paid' && (
                    <div
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                      style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontFamily: 'var(--font-ibm-arabic)' }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      تم السداد
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-3">
                <p className="text-sm" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                  لا توجد فاتورة لهذا الشهر بعد
                </p>
              </div>
            )}

            {/* Digital ID card button */}
            <button
              onClick={() => setShowCard(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-bold transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
                border: '1px solid rgba(139,92,246,0.3)',
                color: '#a78bfa',
                fontFamily: 'var(--font-ibm-arabic)',
              }}
            >
              <CreditCard className="w-4 h-4" />
              عرض البطاقة الرقمية
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Digital ID Card Modal */}
      <AnimatePresence>
        {showCard && subscriber && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowCard(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full max-w-sm"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>البطاقة الرقمية للمشترك</h2>
                <button onClick={() => setShowCard(false)} className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* The card */}
              <div
                className="rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #1e3a5f 100%)',
                  border: '1px solid rgba(167,139,250,0.25)',
                  boxShadow: '0 25px 60px rgba(99,102,241,0.3)',
                }}
              >
                {/* Header */}
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] tracking-widest uppercase font-bold" style={{ color: 'rgba(167,139,250,0.7)' }}>S.G.M</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(196,181,253,0.8)', fontFamily: 'var(--font-ibm-arabic)' }}>نظام إدارة الشبكة الكهربائية</p>
                  </div>
                  <div
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5"
                    style={{
                      background: subscriber.active !== false ? 'rgba(16,185,129,0.2)' : 'rgba(107,114,128,0.2)',
                      color: subscriber.active !== false ? '#10b981' : '#9ca3af',
                      border: `1px solid ${subscriber.active !== false ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.3)'}`,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: subscriber.active !== false ? '#10b981' : '#9ca3af' }} />
                    {subscriber.active !== false ? 'نشط' : 'معلق'}
                  </div>
                </div>

                {/* QR + info */}
                <div className="px-5 py-3 flex gap-4 items-start">
                  <div className="p-2 rounded-2xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                    <QRCodeSVG
                      value={`SGM:${subscriber.sub_code}:${subscriber.full_name}`}
                      size={100}
                      bgColor="transparent"
                      fgColor="#1e1b4b"
                      level="M"
                    />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-base font-bold leading-snug" style={{ color: '#fff', fontFamily: 'var(--font-ibm-arabic)' }}>
                      {subscriber.full_name}
                    </p>
                    <p className="text-xl font-black mt-1 font-mono tracking-wider" style={{ color: '#a78bfa' }} dir="ltr">
                      {subscriber.sub_code}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      {subscriber.sub_type === 'commercial'
                        ? <Briefcase className="w-3 h-3" style={{ color: 'rgba(196,181,253,0.7)' }} />
                        : <Home className="w-3 h-3" style={{ color: 'rgba(196,181,253,0.7)' }} />
                      }
                      <span className="text-xs" style={{ color: 'rgba(196,181,253,0.8)', fontFamily: 'var(--font-ibm-arabic)' }}>
                        {subscriber.sub_type === 'commercial' ? 'اشتراك تجاري' : 'اشتراك سكني'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mx-5 border-t" style={{ borderColor: 'rgba(167,139,250,0.15)' }} />

                {/* Details grid */}
                <div className="px-5 py-3 grid grid-cols-2 gap-3">
                  {[
                    { label: 'عدد الأمبيرات', value: `${subscriber.amps} A`, color: '#60a5fa' },
                    { label: 'رقم الاتصال',   value: subscriber.phone ?? '—',      color: '#34d399' },
                    { label: 'المولد',         value: genMeta?.genCode ?? '—',      color: '#f59e0b' },
                    { label: 'المنطقة',        value: genMeta?.genArea ?? (region?.region_name ?? '—'), color: '#a78bfa' },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[9px] uppercase tracking-wide mb-0.5" style={{ color: 'rgba(196,181,253,0.5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                        {item.label}
                      </p>
                      <p className="text-xs font-bold" style={{ color: item.color, fontFamily: item.label === 'المولد' ? 'var(--font-sans)' : 'var(--font-ibm-arabic)' }} dir={item.label === 'المولد' ? 'ltr' : undefined}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(167,139,250,0.1)' }}>
                  <div>
                    <p className="text-[9px]" style={{ color: 'rgba(196,181,253,0.5)', fontFamily: 'var(--font-ibm-arabic)' }}>صاحب المولد</p>
                    <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-ibm-arabic)' }}>
                      {genMeta?.ownerName ?? '—'}
                    </p>
                  </div>
                  <div className="text-start">
                    <p className="text-[9px]" style={{ color: 'rgba(196,181,253,0.5)', fontFamily: 'var(--font-ibm-arabic)' }}>العنوان</p>
                    <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-ibm-arabic)' }}>
                      {subscriber.address ?? genMeta?.genArea ?? '—'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
        يمكنك إيجاد رمز المشترك على وصل الكهرباء الخاص بك
      </p>
    </div>
  );
}

/* ── Main citizen portal ── */
export default function CitizenPortal() {
  const { isDark, toggle } = useTheme();
  const [tab, setTab]                 = useState<'generator' | 'billing'>('generator');
  const [query, setQuery]           = useState('');
  const [submitted, setSubmitted]   = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Look up generator from Supabase — accepts G-XXXX or plain number
  const normalized = query.trim().toUpperCase().startsWith('G-')
    ? query.trim().toUpperCase()
    : `G-${pad(parseInt(query) || 0)}`;

  const [gen, setGen] = useState<{ id: number; area: string; status: GeneratorStatus; power: number; hours: number } | null>(null);
  const [genLoading, setGenLoading] = useState(false);

  useEffect(() => {
    if (!submitted) return;
    const numId = parseInt(normalized.replace('G-', ''));
    if (!numId) return;
    setGenLoading(true);
    supabase
      .from('generators')
      .select('id, area, status, power, hours')
      .eq('id', numId)
      .neq('is_mock', true)
      .maybeSingle()
      .then(({ data }) => {
        setGen(data as typeof gen);
        setGenLoading(false);
      });
  }, [submitted, normalized]);

  const downtime = gen ? YEAR_HOURS - gen.hours : 0;
  const opHours  = gen ? gen.hours : 0;
  const pct      = gen ? Math.round((opHours / YEAR_HOURS) * 100) : 0;

  const handleSearch = () => {
    if (!query.trim()) return;
    setSubmitted(true);
    setReportSent(false);
  };

  const handleReportSubmit = () => {
    setShowReport(false);
    setReportSent(true);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: isDark ? '#080810' : '#f0f4f8', color: 'var(--text-1)' }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-header)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>S.G.M</p>
            <p className="text-[10px]" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>بوابة المواطن</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="p-2 rounded-xl transition-colors text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-4)' }}
            title={isDark ? 'وضع فاتح' : 'وضع داكن'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <Link href="/dashboard">
            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-colors"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              لوحة الإدارة
            </button>
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-start pt-12 px-5 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg space-y-8"
        >
          {/* Title */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-emerald-400/15 border border-emerald-400/25 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>
              بوابة المواطن
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
              {tab === 'generator' ? 'أدخل كود المولد للاطلاع على ساعات التشغيل وتقديم البلاغات' : 'استعلم عن فاتورتك الشهرية وادفع إلكترونياً'}
            </p>
          </div>

          {/* Tab switcher */}
          <div
            className="flex rounded-2xl p-1 gap-1"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}
          >
            {([['generator', 'معلومات المولد', Zap], ['billing', 'فاتورتي الشهرية', ReceiptText]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background:  tab === key ? (key === 'generator' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)') : 'transparent',
                  color:       tab === key ? (key === 'generator' ? '#10b981' : '#f59e0b') : 'var(--text-4)',
                  border:      tab === key ? `1px solid ${key === 'generator' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` : '1px solid transparent',
                  fontFamily:  'var(--font-ibm-arabic)',
                }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {tab === 'billing' ? <BillingInquiry /> : (<>
          {/* Search box */}
          <div className="space-y-3">
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
              style={{ background: 'var(--bg-card)', border: '2px solid var(--border-normal)', backdropFilter: 'blur(16px)' }}
            >
              <span className="text-sm font-mono font-bold text-emerald-400 flex-shrink-0">G-</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSubmitted(false); setReportSent(false); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="أدخل رقم المولد (مثال: 0042)"
                className="flex-1 bg-transparent outline-none text-lg font-mono tracking-widest"
                style={{ color: 'var(--text-1)' }}
                inputMode="numeric"
                maxLength={8}
              />
              {query && (
                <button onClick={() => { setQuery(''); setSubmitted(false); }} style={{ color: 'var(--text-5)' }}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={!query.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all"
              style={{
                background: query.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--surface)',
                color:      query.trim() ? 'white' : 'var(--text-5)',
                fontFamily: 'var(--font-ibm-arabic)',
                cursor:     query.trim() ? 'pointer' : 'not-allowed',
                boxShadow:  query.trim() ? '0 4px 20px rgba(16,185,129,0.3)' : 'none',
              }}
            >
              <Search className="w-4 h-4" />
              عرض معلومات المولد
            </button>
          </div>

          {/* Results */}
          <AnimatePresence mode="wait">
            {submitted && (
              <motion.div
                key={normalized}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                {gen ? (
                  <>
                    {/* Generator info card */}
                    <div
                      className="rounded-3xl p-5 space-y-4"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)', backdropFilter: 'blur(16px)' }}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-2xl flex items-center justify-center"
                            style={{ background: STATUS_BG[gen.status] }}
                          >
                            <Zap className="w-5 h-5" style={{ color: STATUS_COLOR[gen.status] }} />
                          </div>
                          <div>
                            <p className="text-base font-bold font-mono" style={{ color: 'var(--text-1)' }}>{normalized}</p>
                            <p className="text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                              📍 حي {gen.area} — الرمادي
                            </p>
                          </div>
                        </div>
                        <span
                          className="text-xs px-3 py-1.5 rounded-xl font-medium"
                          style={{ background: STATUS_BG[gen.status], color: STATUS_COLOR[gen.status], fontFamily: 'var(--font-ibm-arabic)' }}
                        >
                          {STATUS_LABEL[gen.status]}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Operating hours */}
                        <div
                          className="rounded-2xl p-4 space-y-2"
                          style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-medium text-emerald-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                              ساعات التشغيل
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-emerald-400">{opHours.toLocaleString('en-US')}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                            من أصل {YEAR_HOURS.toLocaleString('en-US')} ساعة/سنة
                          </p>
                        </div>

                        {/* Downtime */}
                        <div
                          className="rounded-2xl p-4 space-y-2"
                          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}
                        >
                          <div className="flex items-center gap-2">
                            <WifiOff className="w-4 h-4 text-red-400" />
                            <span className="text-xs font-medium text-red-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                              ساعات الانقطاع
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-red-400">{(YEAR_HOURS - opHours).toLocaleString('en-US')}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                            نسبة الانقطاع: {100 - pct}%
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>نسبة التشغيل السنوية</span>
                          <span className="font-bold text-emerald-400">{pct}%</span>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.9, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: pct >= 70 ? '#10b981' : pct >= 40 ? '#f97316' : '#ef4444' }}
                          />
                        </div>
                      </div>

                      {/* Power */}
                      <div
                        className="flex items-center justify-between px-4 py-3 rounded-2xl"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
                      >
                        <span className="text-sm" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>الطاقة المُولَّدة</span>
                        <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{gen.power} KW</span>
                      </div>
                    </div>

                    {/* Report sent success */}
                    <AnimatePresence>
                      {reportSent && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-3 p-4 rounded-2xl"
                          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
                        >
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          <p className="text-sm text-emerald-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                            تم إرسال بلاغك بنجاح إلى مركز الأعطال. سيتم مراجعته قريباً.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Report button */}
                    {!reportSent && (
                      <button
                        onClick={() => setShowReport(true)}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-medium transition-all"
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          border:     '1px solid rgba(239,68,68,0.25)',
                          color:      '#ef4444',
                          fontFamily: 'var(--font-ibm-arabic)',
                        }}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        إبلاغ المسؤولين عن مشكلة
                      </button>
                    )}
                  </>
                ) : (
                  <div
                    className="rounded-3xl p-8 text-center space-y-3"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}
                  >
                    <WifiOff className="w-10 h-10 mx-auto" style={{ color: 'var(--text-5)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>
                      لم يُعثر على المولد <span className="font-mono">{normalized}</span>
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                      تأكد من الكود. المولدات المتاحة: G-0001 إلى G-0300
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Help text */}
          {!submitted && (
            <p className="text-center text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
              يمكنك إيجاد كود المولد على لوحة المولد أو وصل الكهرباء الخاص بك
            </p>
          )}
          </>)}
        </motion.div>
      </div>

      {/* Report modal */}
      <AnimatePresence>
        {showReport && gen && (
          <ReportModal
            code={normalized}
            onClose={() => setShowReport(false)}
            onSubmit={handleReportSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
