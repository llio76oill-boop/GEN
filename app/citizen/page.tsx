'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Search, Clock, WifiOff, AlertTriangle, Send, X, CheckCircle2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { GENERATORS, STATUS_COLOR, STATUS_LABEL, STATUS_BG } from '@/data/generators';
import { useTheme } from '@/contexts/ThemeContext';

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

/* ── Main citizen portal ── */
export default function CitizenPortal() {
  const { isDark, toggle } = useTheme();
  const [query, setQuery]           = useState('');
  const [submitted, setSubmitted]   = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Look up generator — accepts G-XXXX or plain number
  const normalized = query.trim().toUpperCase().startsWith('G-')
    ? query.trim().toUpperCase()
    : `G-${pad(parseInt(query) || 0)}`;

  const gen = submitted
    ? GENERATORS.find((g) => `G-${pad(g.id)}` === normalized)
    : undefined;

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
            <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>S.P.G.M.S</p>
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
              أدخل كود المولد للاطلاع على ساعات التشغيل وتقديم البلاغات
            </p>
          </div>

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
                          <p className="text-2xl font-bold text-emerald-400">{opHours.toLocaleString('ar-EG')}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                            من أصل {YEAR_HOURS.toLocaleString('ar-EG')} ساعة/سنة
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
                          <p className="text-2xl font-bold text-red-400">{(YEAR_HOURS - opHours).toLocaleString('ar-EG')}</p>
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
