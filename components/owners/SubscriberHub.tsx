'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  Users, UserPlus, Zap, Phone, Hash, Home, Briefcase,
  Download, Upload, ChevronDown, X, Check,
  Printer, Share2, Loader2, AlertCircle, Search,
  MessageCircle, Clock, Wifi, WifiOff,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatIQD, billStatusMeta } from '@/lib/obfuscate';

// SSR-safe QR code
const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((m) => m.QRCodeSVG),
  { ssr: false, loading: () => <div className="w-32 h-32 animate-pulse rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} /> },
);

/* ── Types ── */
export interface SubRow {
  id: number;
  sub_code: string;
  full_name: string;
  region_id: string;
  owned_gen_id: number | null;
  amps: number;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  sub_type: 'residential' | 'commercial';
  active: boolean;
  created_at: string;
  bills?: { status: string; total_iqd: number; month_label: string }[];
}

interface OwnerMeta {
  name: string;
  phone: string;
  genCode: string;
  genArea: string;
  ownedGenId: number | null;
  totalHours: number;
  totalOperators: number;
  thingspeakChannel: string | null;
  isOnline: boolean;
}

/* ── Form state ── */
interface SubForm {
  full_name: string;
  phone: string;
  whatsapp: string;
  address: string;
  amps: string;
  sub_type: 'residential' | 'commercial';
}

const EMPTY_FORM: SubForm = {
  full_name: '', phone: '', whatsapp: '', address: '', amps: '', sub_type: 'residential',
};

/* ── Operator form state ── */
interface OpForm {
  name: string;
  phone: string;
  shift: 'صباحي' | 'مسائي' | 'ليلي';
  shift_start: string;
  shift_end: string;
}
const EMPTY_OP: OpForm = { name: '', phone: '', shift: 'صباحي', shift_start: '06:00', shift_end: '14:00' };

/* ─────────────────────────────────────── LIVE RIBBON ── */
function LiveRibbon({ meta }: { meta: OwnerMeta | null }) {
  if (!meta) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card p-3 h-16 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>
    );
  }
  const stats = [
    {
      label: 'حالة المولد',
      value: meta.isOnline ? 'متصل' : 'غير متصل',
      color: meta.isOnline ? '#10b981' : '#ef4444',
      icon: meta.isOnline ? Wifi : WifiOff,
      pulse: meta.isOnline,
    },
    {
      label: 'ساعات التشغيل',
      value: meta.totalHours.toLocaleString('ar-IQ'),
      color: '#3b82f6',
      icon: Clock,
      pulse: false,
    },
    {
      label: 'عدد المشغلين',
      value: meta.totalOperators,
      color: '#a78bfa',
      icon: Users,
      pulse: false,
    },
    {
      label: 'قناة ThingSpeak',
      value: meta.thingspeakChannel ? `CH-${meta.thingspeakChannel}` : 'غير مربوط',
      color: meta.thingspeakChannel ? '#f59e0b' : '#6b7280',
      icon: Zap,
      pulse: false,
    },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="glass-card p-3 flex items-center gap-3"
            style={{ borderColor: `${s.color}20` }}
          >
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <Icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              {s.pulse && (
                <span
                  className="absolute -top-0.5 -end-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-card)] animate-pulse"
                  style={{ background: s.color }}
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs truncate" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                {s.label}
              </p>
              <p className="text-sm font-bold truncate" style={{ color: s.color }}>
                {String(s.value)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────── ID CARD MODAL ── */
function IdCardModal({
  sub,
  meta,
  onClose,
}: {
  sub: SubRow;
  meta: OwnerMeta;
  onClose: () => void;
}) {
  const qrValue = JSON.stringify({
    id: sub.sub_code,
    name: sub.full_name,
    amps: sub.amps,
    gen: meta.genCode,
    area: meta.genArea,
  });

  const waMessage = encodeURIComponent(
    `مرحباً ${sub.full_name} 👋\n\nأهلاً بك في نظام إدارة الشبكة الكهربائية الذكية (S.P.G.M.S)\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🪪 *بيانات اشتراكك*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `• الاسم الكامل: ${sub.full_name}\n` +
    `• كود المشترك: ${sub.sub_code}\n` +
    `• عدد الأمبيرات المسجلة: ${sub.amps} أمبير\n` +
    `• نوع الاشتراك: ${sub.sub_type === 'residential' ? 'سكني 🏠' : 'تجاري 🏬'}\n` +
    `• المنطقة: ${meta.genArea}\n` +
    `• مولد التغذية: ${meta.genCode}\n` +
    `• اسم صاحب المولد: ${meta.name}\n\n` +
    `✅ اشتراكك مُفعَّل ويمكنك الاعتماد على هذه البطاقة كمرجع رسمي.\n` +
    `للاستفسار تواصل مع صاحب المولد: ${meta.phone}`
  );

  const waPhone = (sub.whatsapp ?? sub.phone ?? '').replace(/\D/g, '');
  const waUrl = `https://wa.me/${waPhone}?text=${waMessage}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Close button */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>
            البطاقة الرقمية للمشترك
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-4)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── The Digital ID Card ── */}
        <div
          id="subscriber-id-card"
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #1e3a5f 100%)',
            border: '1px solid rgba(167,139,250,0.25)',
            boxShadow: '0 25px 60px rgba(99,102,241,0.25)',
          }}
        >
          {/* Card header */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] tracking-widest uppercase font-bold" style={{ color: 'rgba(167,139,250,0.7)' }}>
                S.P.G.M.S
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(196,181,253,0.8)', fontFamily: 'var(--font-ibm-arabic)' }}>
                نظام إدارة الشبكة الكهربائية
              </p>
            </div>
            <div
              className="px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5"
              style={{
                background: sub.active ? 'rgba(16,185,129,0.2)' : 'rgba(107,114,128,0.2)',
                color: sub.active ? '#10b981' : '#9ca3af',
                border: `1px solid ${sub.active ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.3)'}`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sub.active ? '#10b981' : '#9ca3af' }} />
              {sub.active ? 'نشط' : 'معلق'}
            </div>
          </div>

          {/* QR + info */}
          <div className="px-5 py-3 flex gap-4 items-start">
            <div
              className="p-2 rounded-2xl flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
            >
              <QRCodeSVG
                value={qrValue}
                size={100}
                bgColor="transparent"
                fgColor="#1e1b4b"
                level="M"
              />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-base font-bold leading-snug" style={{ color: '#fff', fontFamily: 'var(--font-ibm-arabic)' }}>
                {sub.full_name}
              </p>
              <p className="text-xl font-black mt-1 font-mono tracking-wider" style={{ color: '#a78bfa' }} dir="ltr">
                {sub.sub_code}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                {sub.sub_type === 'residential'
                  ? <Home className="w-3 h-3" style={{ color: 'rgba(196,181,253,0.7)' }} />
                  : <Briefcase className="w-3 h-3" style={{ color: 'rgba(196,181,253,0.7)' }} />
                }
                <span className="text-xs" style={{ color: 'rgba(196,181,253,0.8)', fontFamily: 'var(--font-ibm-arabic)' }}>
                  {sub.sub_type === 'residential' ? 'اشتراك سكني' : 'اشتراك تجاري'}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-5 border-t" style={{ borderColor: 'rgba(167,139,250,0.15)' }} />

          {/* Details grid */}
          <div className="px-5 py-3 grid grid-cols-2 gap-3">
            {[
              { label: 'عدد الأمبيرات', value: `${sub.amps} A`, color: '#60a5fa' },
              { label: 'رقم الاتصال', value: sub.phone ?? '—', color: '#34d399' },
              { label: 'المولد', value: meta.genCode, color: '#f59e0b' },
              { label: 'المنطقة', value: meta.genArea, color: '#a78bfa' },
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
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(167,139,250,0.1)' }}
          >
            <div>
              <p className="text-[9px]" style={{ color: 'rgba(196,181,253,0.5)', fontFamily: 'var(--font-ibm-arabic)' }}>صاحب المولد</p>
              <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-ibm-arabic)' }}>
                {meta.name}
              </p>
            </div>
            <div className="text-start">
              <p className="text-[9px]" style={{ color: 'rgba(196,181,253,0.5)', fontFamily: 'var(--font-ibm-arabic)' }}>العنوان</p>
              <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-ibm-arabic)' }}>
                {sub.address ?? meta.genArea}
              </p>
            </div>
          </div>
        </div>

        {/* ── WhatsApp share button ── */}
        <a
          href={waPhone ? waUrl : undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={!waPhone ? (e) => e.preventDefault() : undefined}
          className="mt-4 w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-95"
          style={{
            background: waPhone ? 'linear-gradient(135deg, #25d366, #128c7e)' : 'rgba(107,114,128,0.2)',
            boxShadow: waPhone ? '0 8px 24px rgba(37,211,102,0.35)' : 'none',
            cursor: waPhone ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-ibm-arabic)',
            pointerEvents: waPhone ? 'auto' : 'none',
            opacity: waPhone ? 1 : 0.5,
          }}
        >
          {/* WhatsApp SVG icon */}
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          مشاركة عبر واتساب
        </a>

        {/* Print button */}
        <button
          onClick={() => window.print()}
          className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-normal)', color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}
        >
          <Printer className="w-4 h-4" />
          طباعة البطاقة
        </button>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────── ADD SUBSCRIBER MODAL ── */
function AddSubscriberModal({
  meta,
  onClose,
  onAdded,
}: {
  meta: OwnerMeta;
  onClose: () => void;
  onAdded: (sub: SubRow) => void;
}) {
  const [form, setForm] = useState<SubForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: keyof SubForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!form.full_name.trim()) { setErr('الاسم الثلاثي مطلوب'); return; }
    if (!form.amps || isNaN(Number(form.amps)) || Number(form.amps) <= 0) { setErr('عدد الأمبيرات غير صالح'); return; }
    setSaving(true);

    try {
      // Generate sequential sub code: SUB-{REGION}-{seq}
      const { data: lastSub } = await supabase
        .from('subscribers')
        .select('sub_code')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      let newCode = 'SUB-A1-001';
      if (lastSub?.sub_code) {
        const match = lastSub.sub_code.match(/(\d+)$/);
        const nextNum = match ? parseInt(match[1]) + 1 : 1;
        const regionPart = meta.genArea.slice(0, 2);
        newCode = `SUB-${regionPart}-${String(nextNum).padStart(3, '0')}`;
      }

      const { data: inserted, error } = await supabase
        .from('subscribers')
        .insert({
          sub_code:     newCode,
          full_name:    form.full_name.trim(),
          region_id:    'A1',
          owned_gen_id: meta.ownedGenId,
          amps:         Number(form.amps),
          phone:        form.phone || null,
          whatsapp:     form.whatsapp || null,
          address:      form.address || null,
          sub_type:     form.sub_type,
          active:       true,
        })
        .select('*')
        .single();

      if (error) throw error;
      onAdded(inserted as SubRow);
      onClose();
    } catch (e: unknown) {
      setErr((e as Error).message ?? 'حدث خطأ أثناء الإضافة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>
            إضافة مشترك جديد
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-4)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
              الاسم الثلاثي واللقب *
            </label>
            <input
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              placeholder="مثال: أحمد محمد الحسيني"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-normal)', color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}
              required
            />
          </div>

          {/* Phone + WhatsApp */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
                رقم الهاتف
              </label>
              <input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="07X XXXX XXXX"
                type="tel"
                dir="ltr"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border-normal)', color: 'var(--text-1)' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
                <MessageCircle className="w-3 h-3" style={{ color: '#25d366' }} />
                واتساب
              </label>
              <input
                value={form.whatsapp}
                onChange={(e) => set('whatsapp', e.target.value)}
                placeholder="964XXXXXXXXXX"
                type="tel"
                dir="ltr"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border-normal)', color: 'var(--text-1)' }}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
              العنوان
            </label>
            <input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="الحي / الشارع / رقم الدار"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-normal)', color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}
            />
          </div>

          {/* Amps + Type */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
                عدد الأمبيرات *
              </label>
              <div className="relative">
                <input
                  value={form.amps}
                  onChange={(e) => set('amps', e.target.value)}
                  placeholder="0"
                  type="number"
                  min="1"
                  max="200"
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border-normal)', color: 'var(--text-1)' }}
                  required
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-5)' }}>A</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
                نوع الاشتراك
              </label>
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-normal)' }}>
                {(['residential', 'commercial'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('sub_type', t)}
                    className="flex-1 py-3 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                    style={{
                      background: form.sub_type === t
                        ? t === 'residential' ? 'rgba(59,130,246,0.2)' : 'rgba(245,158,11,0.2)'
                        : 'var(--surface)',
                      color: form.sub_type === t
                        ? t === 'residential' ? '#3b82f6' : '#f59e0b'
                        : 'var(--text-5)',
                      fontFamily: 'var(--font-ibm-arabic)',
                    }}
                  >
                    {t === 'residential' ? <><Home className="w-3 h-3" />سكني</> : <><Briefcase className="w-3 h-3" />تجاري</>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {err && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{err}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
              fontFamily: 'var(--font-ibm-arabic)',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {saving ? 'جارٍ الحفظ…' : 'تسجيل المشترك'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────── ADD OPERATOR MODAL ── */
function AddOperatorModal({
  meta,
  onClose,
  onAdded,
}: {
  meta: OwnerMeta;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState<OpForm>(EMPTY_OP);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof OpForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const shiftDefaults: Record<string, { start: string; end: string }> = {
    'صباحي': { start: '06:00', end: '14:00' },
    'مسائي': { start: '14:00', end: '22:00' },
    'ليلي':  { start: '22:00', end: '06:00' },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!form.name.trim()) { setErr('اسم المشغل مطلوب'); return; }
    if (!meta.ownedGenId) { setErr('لم يتم تحديد المولد'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('operators').insert({
        owned_gen_id: meta.ownedGenId,
        name:         form.name.trim(),
        phone:        form.phone || '',
        shift:        form.shift,
        shift_start:  form.shift_start,
        shift_end:    form.shift_end,
        active:       false,
        is_mock:      false,
      });
      if (error) throw error;
      onAdded();
      onClose();
    } catch (e: unknown) {
      setErr((e as Error).message ?? 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-sm rounded-3xl p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>
            إضافة مشغّل
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-4)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>الاسم الكامل *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="اسم المشغّل" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--border-normal)', color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }} required />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>رقم الهاتف</label>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} type="tel" dir="ltr" placeholder="07X XXXX XXXX" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--border-normal)', color: 'var(--text-1)' }} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>المناوبة</label>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-normal)' }}>
              {(['صباحي', 'مسائي', 'ليلي'] as const).map((s) => (
                <button key={s} type="button" onClick={() => { set('shift', s); set('shift_start', shiftDefaults[s].start); set('shift_end', shiftDefaults[s].end); }}
                  className="flex-1 py-2.5 text-xs font-medium transition-all"
                  style={{ background: form.shift === s ? 'rgba(99,102,241,0.2)' : 'var(--surface)', color: form.shift === s ? '#818cf8' : 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>بداية المناوبة</label>
              <input type="time" value={form.shift_start} onChange={(e) => set('shift_start', e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--border-normal)', color: 'var(--text-1)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>نهاية المناوبة</label>
              <input type="time" value={form.shift_end} onChange={(e) => set('shift_end', e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--border-normal)', color: 'var(--text-1)' }} />
            </div>
          </div>
          <AnimatePresence>
            {err && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{err}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', boxShadow: '0 8px 24px rgba(99,102,241,0.3)', fontFamily: 'var(--font-ibm-arabic)', opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {saving ? 'جارٍ الحفظ…' : 'تسجيل المشغّل'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────── EXPORT/IMPORT DROPDOWN ── */
function ExportMenu({ subs }: { subs: SubRow[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const exportCsv = () => {
    const headers = 'كود المشترك,الاسم الكامل,الأمبيرات,نوع الاشتراك,رقم الهاتف,رقم الواتساب,العنوان,الحالة,تاريخ الإضافة';
    const rows = subs.map((s) =>
      [s.sub_code, s.full_name, s.amps, s.sub_type === 'residential' ? 'سكني' : 'تجاري',
       s.phone ?? '', s.whatsapp ?? '', s.address ?? '', s.active ? 'نشط' : 'معلق',
       new Date(s.created_at).toLocaleDateString('ar-IQ')].join(',')
    );
    const csv = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs transition-all"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-normal)', color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}
      >
        <Download className="w-3.5 h-3.5" />
        تصدير / استيراد
        <ChevronDown className="w-3.5 h-3.5" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute end-0 mt-2 w-48 rounded-2xl overflow-hidden z-30"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)', boxShadow: '0 16px 40px rgba(0,0,0,0.3)' }}
          >
            <button onClick={exportCsv} className="w-full flex items-center gap-3 px-4 py-3 text-xs transition-colors hover:bg-white/5" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              تصدير CSV
            </button>
            <button onClick={() => { fileRef.current?.click(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs transition-colors hover:bg-white/5" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              استيراد CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={() => { /* future: parse CSV */ }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────── SUBSCRIBER ROW ── */
function SubCard({ sub, meta, onCardClick }: { sub: SubRow; meta: OwnerMeta; onCardClick: (s: SubRow) => void }) {
  const latestBill = sub.bills?.length
    ? [...sub.bills].sort((a, b) => b.month_label.localeCompare(a.month_label))[0]
    : null;
  const billMeta = latestBill ? billStatusMeta(latestBill.status as 'pending' | 'paid' | 'overdue') : null;

  return (
    <div
      className="flex flex-wrap items-center gap-3 p-4 rounded-2xl transition-all"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold" style={{ color: '#a78bfa' }} dir="ltr">{sub.sub_code}</span>
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: sub.active ? '#10b981' : '#6b7280', boxShadow: sub.active ? '0 0 5px #10b981' : 'none' }}
          />
        </div>
        <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>{sub.full_name}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-5)' }}>
            <Zap className="w-3 h-3" />{sub.amps} A
          </span>
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
            {sub.sub_type === 'residential' ? <><Home className="w-3 h-3" />سكني</> : <><Briefcase className="w-3 h-3" />تجاري</>}
          </span>
          {billMeta && latestBill && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: billMeta.bg, color: billMeta.color, fontFamily: 'var(--font-ibm-arabic)' }}>
              {billMeta.label} · {formatIQD(latestBill.total_iqd)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {sub.phone && (
          <a href={`tel:${sub.phone.replace(/\s/g, '')}`}
            className="p-2 rounded-xl transition-all"
            style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.15)' }}>
            <Phone className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          onClick={() => onCardClick(sub)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
          style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)', fontFamily: 'var(--font-ibm-arabic)' }}
        >
          <Hash className="w-3 h-3" />
          اظهر البطاقة
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── MAIN HUB COMPONENT ── */
export default function SubscriberHub({ ownerMeta }: { ownerMeta: OwnerMeta | null }) {
  const [subs, setSubs]               = useState<SubRow[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [search, setSearch]           = useState('');
  const [showAddSub, setShowAddSub]   = useState(false);
  const [showAddOp, setShowAddOp]     = useState(false);
  const [cardSub, setCardSub]         = useState<SubRow | null>(null);
  const [opRefresh, setOpRefresh]     = useState(0);

  // Fetch subscribers with their latest bills
  const fetchSubs = useCallback(async () => {
    if (!ownerMeta?.ownedGenId) return;
    setLoadingSubs(true);
    const { data } = await supabase
      .from('subscribers')
      .select('*, bills(status, total_iqd, month_label)')
      .eq('owned_gen_id', ownerMeta.ownedGenId)
      .order('id', { ascending: false });
    setSubs((data as SubRow[]) ?? []);
    setLoadingSubs(false);
  }, [ownerMeta?.ownedGenId]);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  const filtered = subs.filter((s) => {
    const q = search.trim().toLowerCase();
    return !q || s.full_name.toLowerCase().includes(q) || s.sub_code.toLowerCase().includes(q);
  });

  return (
    <div dir="rtl" className="space-y-5">
      {/* Phase 1 — Live Status Ribbon */}
      <LiveRibbon meta={ownerMeta} />

      {/* Phase 2 — Action Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Operator */}
          <button
            onClick={() => setShowAddOp(true)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', fontFamily: 'var(--font-ibm-arabic)' }}
          >
            <Users className="w-3.5 h-3.5" />
            إضافة مشغّل
          </button>

          {/* Add Subscriber — primary */}
          <button
            onClick={() => setShowAddSub(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            <UserPlus className="w-3.5 h-3.5" />
            إضافة مشترك
          </button>
        </div>

        <ExportMenu subs={subs} />
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
          placeholder="ابحث باسم المشترك أو كوده..."
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ color: 'var(--text-5)' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Subscriber count pill */}
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
        <span>
          {loadingSubs ? 'جارٍ التحميل...' : `${filtered.length} مشترك`}
          {search && ` (نتيجة "${search}")`}
        </span>
        <button onClick={fetchSubs} className="flex items-center gap-1 hover:text-blue-400 transition-colors">
          <Check className="w-3 h-3" />
          تحديث
        </button>
      </div>

      {/* Subscriber list */}
      {loadingSubs ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--text-5)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-5)' }} />
          <p className="text-sm" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
            {search ? 'لا توجد نتائج مطابقة' : 'لا يوجد مشتركون مسجلون بعد'}
          </p>
          {!search && (
            <button
              onClick={() => setShowAddSub(true)}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', fontFamily: 'var(--font-ibm-arabic)' }}
            >
              إضافة المشترك الأول
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((sub) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <SubCard
                  sub={sub}
                  meta={ownerMeta!}
                  onCardClick={setCardSub}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAddSub && ownerMeta && (
          <AddSubscriberModal
            meta={ownerMeta}
            onClose={() => setShowAddSub(false)}
            onAdded={(sub) => {
              setSubs((prev) => [sub, ...prev]);
              setCardSub(sub); // immediately show ID card
            }}
          />
        )}
        {showAddOp && ownerMeta && (
          <AddOperatorModal
            meta={ownerMeta}
            onClose={() => setShowAddOp(false)}
            onAdded={() => setOpRefresh((v) => v + 1)}
          />
        )}
        {cardSub && ownerMeta && (
          <IdCardModal
            sub={cardSub}
            meta={ownerMeta}
            onClose={() => setCardSub(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
