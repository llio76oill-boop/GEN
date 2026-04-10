'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone, CreditCard, Banknote, CheckCircle2,
  AlertTriangle, Loader2, ArrowRight, Copy, Check, X,
  Lock, QrCode, Receipt, User, Zap, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { obfuscateArabicName, calcBillTotal, formatIQD, billStatusMeta } from '@/lib/obfuscate';
import { useTheme } from '@/contexts/ThemeContext';

// ── Types ─────────────────────────────────────────────────────────────────
interface Subscriber {
  id: number;
  sub_code: string;
  full_name: string;
  region_id: string;
  amps: number;
  active: boolean;
}
interface RegionPricing {
  region_id: string;
  region_name: string;
  price_per_amp: number;
  commission: number;
}
interface Bill {
  id: number;
  subscriber_id: number;
  month_label: string;
  amps: number;
  price_per_amp: number;
  commission: number;
  total_iqd: number;
  status: 'pending' | 'paid' | 'overdue';
  paid_at: string | null;
}
type PayMethod = 'zaincash' | 'superkey' | 'card' | 'cash' | null;

// ── Copy button ────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg transition-colors"
      style={{ background: 'rgba(255,255,255,0.06)', color: copied ? '#10b981' : 'var(--text-5)' }}
      title="نسخ"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── ZainCash / SuperKey panel ──────────────────────────────────────────────
function ZainCashPanel({
  bill, subCode, method, onPaid,
}: {
  bill: Bill; subCode: string; method: 'zaincash' | 'superkey'; onPaid: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [ref, setRef]               = useState('');
  const [done, setDone]             = useState(false);

  const phoneNo     = method === 'zaincash' ? '0780 000 7000' : '0770 000 6000';
  const serviceName = method === 'zaincash' ? 'ZainCash' : 'SuperKey';
  const accent      = method === 'zaincash' ? '#3b82f6' : '#a855f7';
  const paymentRef  = `SPGMS-${bill.id}-${subCode}`;
  const qrData      = encodeURIComponent(
    `${method}://pay?amount=${bill.total_iqd}&ref=${paymentRef}&sub=${subCode}`
  );

  const handleConfirm = async () => {
    if (!ref.trim()) return;
    setConfirming(true);
    await supabase.from('payments').insert({
      bill_id: bill.id, method, amount_iqd: bill.total_iqd,
      transaction_ref: ref.trim(),
      description: `${serviceName} payment by ${subCode} for ${bill.month_label}`,
    });
    await supabase.from('bills')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', bill.id);
    setConfirming(false);
    setDone(true);
    setTimeout(onPaid, 1500);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3">
        <div className="w-44 h-44 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: '#fff', padding: '8px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&format=png`}
            alt={`QR ${serviceName}`} width={170} height={170} className="rounded-lg"
          />
        </div>
        <p className="text-xs text-center" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
          امسح الرمز بتطبيق {serviceName}
        </p>
      </div>

      <div className="space-y-2" dir="rtl">
        {[
          { label: 'رقم المحفظة', value: phoneNo,                    mono: true },
          { label: 'المبلغ',       value: formatIQD(bill.total_iqd), mono: true },
          { label: 'رقم المرجع',  value: paymentRef,                 mono: true },
        ].map(({ label, value, mono }) => (
          <div key={label} className="flex items-center justify-between rounded-xl px-4 py-2.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>{label}</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--text-1)' }} dir="ltr">{value}</span>
              <CopyButton text={value} />
            </div>
          </div>
        ))}
      </div>

      {!done && (
        <div className="space-y-3" dir="rtl">
          <label className="text-xs font-medium block" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
            أدخل رقم العملية من {serviceName} لتأكيد الدفع
          </label>
          <input
            value={ref} onChange={(e) => setRef(e.target.value)}
            placeholder="TXN-XXXXXXXX" dir="ltr"
            className="w-full rounded-xl px-4 py-3 text-sm font-mono outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-1)' }}
            onFocus={(e) => (e.target.style.borderColor = `${accent}80`)}
            onBlur={(e)  => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
          <button
            onClick={handleConfirm} disabled={!ref.trim() || confirming}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-all"
            style={{
              background: ref.trim() ? `${accent}20` : 'var(--surface)',
              border: `1px solid ${ref.trim() ? `${accent}50` : 'var(--border-subtle)'}`,
              color: ref.trim() ? accent : 'var(--text-5)',
              cursor: ref.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            {confirming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            تأكيد الدفع عبر {serviceName}
          </button>
        </div>
      )}

      {done && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-3 p-4 rounded-2xl justify-center"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            تم تسجيل الدفع بنجاح
          </span>
        </motion.div>
      )}
    </div>
  );
}

// ── Credit Card panel ──────────────────────────────────────────────────────
function CardPanel({ bill, subCode, onPaid }: { bill: Bill; subCode: string; onPaid: () => Promise<void> }) {
  const [cardNum, setCardNum] = useState('');
  const [expiry,  setExpiry]  = useState('');
  const [cvv,     setCvv]     = useState('');
  const [holder,  setHolder]  = useState('');
  const [saving,  setSaving]  = useState(false);
  const [done,    setDone]    = useState(false);

  const formatCardNum = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();
  const formatExpiry  = (v: string) => v.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d+)/, '$1/$2');

  const isVisa = cardNum.replace(/\s/g, '').startsWith('4');
  const isMC   = ['51','52','53','54','55'].some((p) => cardNum.replace(/\s/g, '').startsWith(p));

  const valid =
    cardNum.replace(/\s/g, '').length === 16 && expiry.length === 5 &&
    cvv.length >= 3 && holder.trim().length >= 3;

  const handlePay = async () => {
    if (!valid) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1400));
    await supabase.from('payments').insert({
      bill_id: bill.id, method: 'card', amount_iqd: bill.total_iqd,
      transaction_ref: `CARD-${Date.now()}`,
      description: `Card payment ${isVisa ? 'Visa' : isMC ? 'Mastercard' : ''} by ${subCode}`,
    });
    await supabase.from('bills')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', bill.id);
    setSaving(false);
    setDone(true);
    setTimeout(onPaid, 1500);
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)',
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
        style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <Lock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        <span className="text-xs text-emerald-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
          بيانات بطاقتك محمية بتشفير TLS — لا يتم تخزين تفاصيل البطاقة
        </span>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>رقم البطاقة</label>
        <div className="relative">
          <input value={cardNum} onChange={(e) => setCardNum(formatCardNum(e.target.value))}
            placeholder="XXXX XXXX XXXX XXXX" dir="ltr" inputMode="numeric" maxLength={19}
            className="w-full rounded-xl px-4 py-3 pe-12 text-lg font-mono tracking-widest outline-none"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
            onBlur={(e)  => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
          <div className="absolute end-3 top-1/2 -translate-y-1/2 flex gap-1">
            {(isVisa || !cardNum) && <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: '#1a1f71', color: '#fff' }}>VISA</span>}
            {(isMC   || !cardNum) && <div className="flex -space-x-2 rtl:space-x-reverse"><span className="w-5 h-5 rounded-full bg-red-500/80 block" /><span className="w-5 h-5 rounded-full bg-yellow-400/80 block" /></div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>تاريخ الانتهاء</label>
          <input value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            placeholder="MM/YY" dir="ltr" inputMode="numeric" maxLength={5}
            className="w-full rounded-xl px-4 py-3 text-sm font-mono outline-none" style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
            onBlur={(e)  => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>CVV / CVC</label>
          <input value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="XXX" dir="ltr" type="password" inputMode="numeric" maxLength={4}
            className="w-full rounded-xl px-4 py-3 text-sm font-mono outline-none" style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
            onBlur={(e)  => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>اسم حامل البطاقة</label>
        <input value={holder} onChange={(e) => setHolder(e.target.value)}
          placeholder="FULL NAME AS ON CARD" dir="ltr"
          className="w-full rounded-xl px-4 py-3 text-sm font-mono uppercase outline-none tracking-wide"
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
          onBlur={(e)  => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
        />
      </div>

      {done ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-3 p-4 rounded-2xl justify-center"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>تم الدفع بنجاح</span>
        </motion.div>
      ) : (
        <button onClick={handlePay} disabled={!valid || saving}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all"
          style={{
            background: valid ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--surface)',
            color: valid ? '#fff' : 'var(--text-5)',
            cursor: valid ? 'pointer' : 'not-allowed',
            boxShadow: valid ? '0 4px 20px rgba(16,185,129,0.3)' : 'none',
            fontFamily: 'var(--font-ibm-arabic)',
          }}
        >
          {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> جارٍ المعالجة...</> : <><Lock className="w-4 h-4" /> دفع {formatIQD(bill.total_iqd)} بالبطاقة</>}
        </button>
      )}
    </div>
  );
}

// ── Cash Logging panel ─────────────────────────────────────────────────────
function CashPanel({ bill, subCode, onPaid }: { bill: Bill; subCode: string; onPaid: () => Promise<void> }) {
  const defaultDesc = `وصل دفع للمشترك ${subCode} — شهر ${bill.month_label} — المبلغ ${formatIQD(bill.total_iqd)}`;
  const [receipt, setReceipt] = useState('');
  const [desc,    setDesc]    = useState(defaultDesc);
  const [saving,  setSaving]  = useState(false);
  const [done,    setDone]    = useState(false);

  const isDescValid = desc.includes(subCode);
  const valid = receipt.trim().length >= 3 && isDescValid;

  const handleLog = async () => {
    if (!valid) return;
    setSaving(true);
    await supabase.from('payments').insert({
      bill_id: bill.id, method: 'cash', amount_iqd: bill.total_iqd,
      receipt_number: receipt.trim(), description: desc.trim(), recorded_by: 'citizen',
    });
    await supabase.from('bills')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', bill.id);
    setSaving(false);
    setDone(true);
    setTimeout(onPaid, 1500);
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)',
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <Receipt className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
          سجّل وصل الدفع النقدي. يجب أن يتضمن رمز المشترك في الوصف.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
          رقم الوصل النقدي <span className="text-red-400">*</span>
        </label>
        <input value={receipt} onChange={(e) => setReceipt(e.target.value)}
          placeholder="RCP-2026-XXXX" dir="ltr"
          className="w-full rounded-xl px-4 py-3 text-sm font-mono outline-none"
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(245,158,11,0.5)')}
          onBlur={(e)  => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
            وصف الدفع <span className="text-red-400">*</span>
          </label>
          {isDescValid
            ? <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> يتضمن رمز المشترك</span>
            : <span className="text-[10px] text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> يجب أن يتضمن {subCode}</span>
          }
        </div>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
          rows={3} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(245,158,11,0.5)')}
          onBlur={(e)  => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <span className="text-sm" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>المبلغ المستلم نقداً</span>
        <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-1)' }}>{formatIQD(bill.total_iqd)}</span>
      </div>

      {done ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-3 p-4 rounded-2xl justify-center"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>تم تسجيل الدفع النقدي بنجاح</span>
        </motion.div>
      ) : (
        <button onClick={handleLog} disabled={!valid || saving}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all"
          style={{
            background: valid ? 'rgba(245,158,11,0.15)' : 'var(--surface)',
            border: `1px solid ${valid ? 'rgba(245,158,11,0.4)' : 'var(--border-subtle)'}`,
            color: valid ? '#f59e0b' : 'var(--text-5)',
            cursor: valid ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-ibm-arabic)',
          }}
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
          تسجيل الدفع النقدي
        </button>
      )}
    </div>
  );
}

// ── MethodCard ─────────────────────────────────────────────────────────────
function MethodCard({
  id, icon: Icon, label, sublabel, accent, selected, onSelect, children,
}: {
  id: PayMethod; icon: React.ElementType; label: string; sublabel: string; accent: string;
  selected: boolean; onSelect: () => void; children: React.ReactNode;
}) {
  return (
    <motion.div layout className="rounded-3xl overflow-hidden cursor-pointer transition-all"
      style={{
        background: selected ? `${accent}0d` : 'var(--bg-card)',
        border: `2px solid ${selected ? accent + '60' : 'var(--border-normal)'}`,
        boxShadow: selected ? `0 0 32px ${accent}18` : 'none',
      }}
      onClick={!selected ? onSelect : undefined}
    >
      <div className="flex items-center gap-4 p-5" onClick={onSelect}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}>
          <Icon className="w-6 h-6" style={{ color: accent }} />
        </div>
        <div className="flex-1">
          <p className="text-base font-bold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>{label}</p>
          <p className="text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>{sublabel}</p>
        </div>
        {selected
          ? <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: accent }}><Check className="w-3.5 h-3.5 text-white" /></div>
          : <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-5)', transform: 'rotate(180deg)' }} />
        }
      </div>
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: `${accent}25` }}
              onClick={(e) => e.stopPropagation()}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Inner page (uses useSearchParams) ─────────────────────────────────────
function CheckoutInner() {
  const { isDark, toggle } = useTheme();
  const params  = useSearchParams();
  const subCode = params.get('sub') ?? '';

  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [region,     setRegion]     = useState<RegionPricing | null>(null);
  const [bill,       setBill]       = useState<Bill | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [method,     setMethod]     = useState<PayMethod>(null);

  const fetchData = useCallback(async () => {
    if (!subCode) { setNotFound(true); setLoading(false); return; }
    setLoading(true);

    const { data: sub } = await supabase
      .from('subscribers').select('id,sub_code,full_name,region_id,amps,active')
      .eq('sub_code', subCode).single();
    if (!sub) { setNotFound(true); setLoading(false); return; }
    setSubscriber(sub);

    const [regRes, billRes] = await Promise.all([
      supabase.from('regions_pricing').select('*').eq('region_id', sub.region_id).single(),
      supabase.from('bills').select('*').eq('subscriber_id', sub.id)
        .eq('month_label', new Date().toISOString().slice(0, 7)).single(),
    ]);

    if (regRes.data) setRegion(regRes.data);

    if (!billRes.data && regRes.data) {
      const total = calcBillTotal(sub.amps, regRes.data.price_per_amp, regRes.data.commission);
      const { data: newBill } = await supabase.from('bills').insert({
        subscriber_id: sub.id,
        month_label: new Date().toISOString().slice(0, 7),
        amps: sub.amps, price_per_amp: regRes.data.price_per_amp,
        commission: regRes.data.commission, total_iqd: total, status: 'pending',
      }).select('*').single();
      if (newBill) setBill(newBill);
    } else {
      setBill(billRes.data);
    }
    setLoading(false);
  }, [subCode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!bill) return;
    const chan = supabase.channel(`bill-rt-${bill.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bills', filter: `id=eq.${bill.id}` },
        (payload) => setBill((prev) => prev ? { ...prev, ...(payload.new as Partial<Bill>) } : prev))
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [bill?.id]);

  const handlePaid = useCallback(async () => {
    await fetchData();
    setMethod(null);
  }, [fetchData]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: isDark ? '#080810' : '#f0f4f8', color: 'var(--text-1)' }}>

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-header)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>S.P.G.M.S</p>
            <p className="text-[10px]" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>بوابة الدفع الإلكتروني</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="p-2 rounded-xl transition-colors text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-4)' }}
            title={isDark ? 'وضع فاتح' : 'وضع داكن'}>
            {isDark ? '☀️' : '🌙'}
          </button>
          <Link href="/citizen">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-colors"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              العودة للبوابة
            </button>
          </Link>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="flex-1 px-5 py-8 pb-16">
        <div className="max-w-2xl mx-auto">

          {loading && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-sm" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>جارٍ تحميل بيانات الفاتورة…</p>
            </div>
          )}

          {!loading && (notFound || !subscriber || !region || !bill) && (
            <div className="max-w-md mx-auto mt-20 rounded-3xl p-10 text-center space-y-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }} dir="rtl">
              <AlertTriangle className="w-12 h-12 mx-auto text-amber-400" />
              <p className="text-base font-bold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>المشترك غير موجود</p>
              <p className="text-sm" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                الرمز <span className="font-mono text-amber-400">{subCode || '---'}</span> غير مسجَّل.
              </p>
              <Link href="/citizen"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', fontFamily: 'var(--font-ibm-arabic)' }}>
                <ArrowRight className="w-4 h-4 rotate-180" />
                العودة إلى بوابة المواطن
              </Link>
            </div>
          )}

          {!loading && subscriber && region && bill && (() => {
            const billMeta = billStatusMeta(bill.status);
            const isPaid   = bill.status === 'paid';
            return (
              <div className="space-y-6" dir="rtl">
                {/* Page header */}
                <div className="flex items-center gap-4 flex-wrap">
                  <Link href="/citizen"
                    className="p-2 rounded-xl transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: 'var(--text-4)' }}>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </Link>
                  <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>دفع الفاتورة</h1>
                    <p className="text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>اختر طريقة الدفع المناسبة</p>
                  </div>
                </div>

                {/* Bill summary */}
                <div className="rounded-3xl p-5 space-y-4"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                        style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                        <User className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-mono font-bold" style={{ color: '#10b981' }}>{subscriber.sub_code}</p>
                        <p className="text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                          {obfuscateArabicName(subscriber.full_name)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs px-3 py-1.5 rounded-xl font-medium"
                      style={{ background: billMeta.bg, color: billMeta.color, border: `1px solid ${billMeta.color}40`, fontFamily: 'var(--font-ibm-arabic)' }}>
                      {billMeta.label}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {[
                      { label: 'المنطقة',               value: `${region.region_id} — ${region.region_name}` },
                      { label: 'الاستهلاك',              value: `${subscriber.amps} أمبير` },
                      { label: 'سعر الأمبير',            value: formatIQD(region.price_per_amp) },
                      { label: 'عمولة الخدمة (ثابتة)',   value: formatIQD(region.commission) },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between text-xs px-4 py-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <span style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>{label}</span>
                        <span style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between px-5 py-4 rounded-2xl"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                        إجمالي الفاتورة — {bill.month_label}
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-emerald-400 tabular-nums">
                      {formatIQD(bill.total_iqd)}
                    </span>
                  </div>

                  {isPaid && bill.paid_at && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                      style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-xs text-emerald-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                        تم الدفع في {new Date(bill.paid_at).toLocaleDateString('ar-IQ', { dateStyle: 'long' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Payment methods */}
                {!isPaid && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>اختر طريقة الدفع</p>

                    <MethodCard id="zaincash" icon={QrCode} label="ZainCash"
                      sublabel="دفع إلكتروني عبر محفظة زين كاش" accent="#3b82f6"
                      selected={method === 'zaincash'} onSelect={() => setMethod((m) => m === 'zaincash' ? null : 'zaincash')}>
                      <ZainCashPanel bill={bill} subCode={subCode} method="zaincash" onPaid={handlePaid} />
                    </MethodCard>

                    <MethodCard id="superkey" icon={Smartphone} label="SuperKey"
                      sublabel="دفع إلكتروني عبر محفظة SuperKey" accent="#a855f7"
                      selected={method === 'superkey'} onSelect={() => setMethod((m) => m === 'superkey' ? null : 'superkey')}>
                      <ZainCashPanel bill={bill} subCode={subCode} method="superkey" onPaid={handlePaid} />
                    </MethodCard>

                    <MethodCard id="card" icon={CreditCard} label="بطاقة ائتمانية"
                      sublabel="Visa / Mastercard — مدفوعات آمنة بتشفير TLS" accent="#10b981"
                      selected={method === 'card'} onSelect={() => setMethod((m) => m === 'card' ? null : 'card')}>
                      <CardPanel bill={bill} subCode={subCode} onPaid={handlePaid} />
                    </MethodCard>

                    <MethodCard id="cash" icon={Banknote} label="نقداً"
                      sublabel="تسجيل وصل نقدي" accent="#f59e0b"
                      selected={method === 'cash'} onSelect={() => setMethod((m) => m === 'cash' ? null : 'cash')}>
                      <CashPanel bill={bill} subCode={subCode} onPaid={handlePaid} />
                    </MethodCard>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ── Page (Suspense for useSearchParams in static export) ──────────────────
export default function CitizenCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    }>
      <CheckoutInner />
    </Suspense>
  );
}
