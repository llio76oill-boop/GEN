'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  Users,
  Fuel,
  Loader2,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

interface PendingOperator {
  id: number;
  name: string;
  phone: string;
  shift_start: string;
  shift_end: string;
}

interface PendingGenerator {
  id: number;
  owner_name: string;
  owner_phone: string;
  license_no: string;
  lat: number;
  lng: number;
  fuel_quota: number;
  price_per_hour: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  pending_operators: PendingOperator[];
}

/* ── Mock maintenance logs ── */
const MOCK_LOGS = [
  { id: 1, type: 'صيانة دورية', description: 'تغيير زيت المحرك وفلتر الهواء', date: '2025-01-15', generator: 'GEN-0042' },
  { id: 2, type: 'إصلاح عطل', description: 'إصلاح مشكلة في منظم الجهد', date: '2025-01-10', generator: 'GEN-0107' },
  { id: 3, type: 'فحص', description: 'فحص شامل لمنظومة التبريد', date: '2025-01-05', generator: 'GEN-0042' },
];

/* ── Mock official decrees ── */
const MOCK_DECREES = [
  { id: 1, title: 'تحديث التسعيرة الرسمية للأمبير', date: '2025-01-20', body: 'بناءً على قرار مجلس المحافظة رقم 47 لسنة 2025، تم تثبيت سعر الأمبير بواقع 38 دينار/ساعة.' },
  { id: 2, title: 'ضوابط تشغيل المولدات خلال الصيف', date: '2025-01-01', body: 'يتوجب على جميع أصحاب المولدات الالتزام بساعات التشغيل المحددة من قبل الإدارة.' },
];

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    pending:  { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', label: 'قيد المراجعة', icon: Clock },
    approved: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'مُوافَق', icon: CheckCircle2 },
    rejected: { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', label: 'مرفوض', icon: XCircle },
  }[status] ?? { bg: 'rgba(107,114,128,0.12)', color: '#6b7280', label: status, icon: Clock };

  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

function PendingCard({ gen }: { gen: PendingGenerator }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card overflow-hidden">
      <button
        className="w-full flex items-center gap-4 p-5 text-start"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/20 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-6 h-6 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{gen.owner_name}</h3>
            <StatusBadge status={gen.status} />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--text-4)' }} dir="ltr">{gen.license_no}</span>
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-5)' }}>
              <Users className="w-3 h-3" /> {gen.pending_operators?.length || 0} مشغل
            </span>
            <span className="text-xs" style={{ color: 'var(--text-5)' }}>
              {new Date(gen.created_at).toLocaleDateString('ar-IQ')}
            </span>
          </div>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-5)' }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-5)' }} />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="px-5 pb-5 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="grid grid-cols-2 gap-3 pt-3">
                <div className="text-xs">
                  <span style={{ color: 'var(--text-5)' }}>الهاتف: </span>
                  <span style={{ color: 'var(--text-2)' }} dir="ltr">{gen.owner_phone}</span>
                </div>
                <div className="text-xs">
                  <span style={{ color: 'var(--text-5)' }}>الإحداثيات: </span>
                  <span style={{ color: 'var(--text-2)' }} dir="ltr">{gen.lat.toFixed(4)}, {gen.lng.toFixed(4)}</span>
                </div>
                <div className="text-xs">
                  <span style={{ color: 'var(--text-5)' }}>حصة الوقود: </span>
                  <span style={{ color: 'var(--text-2)' }}>{gen.fuel_quota.toLocaleString()} لتر</span>
                </div>
                <div className="text-xs">
                  <span style={{ color: 'var(--text-5)' }}>التسعيرة: </span>
                  <span style={{ color: '#10b981' }}>{gen.price_per_hour} د.ع/أمبير/ساعة</span>
                </div>
              </div>

              {gen.pending_operators && gen.pending_operators.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wide pt-2" style={{ color: 'var(--text-5)' }}>
                    المشغلون المسجلون
                  </p>
                  {gen.pending_operators.map((op) => (
                    <div
                      key={op.id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
                    >
                      <div className="flex-1">
                        <span className="text-xs font-medium" style={{ color: 'var(--text-1)' }}>{op.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="w-2.5 h-2.5" style={{ color: 'var(--text-5)' }} />
                          <span className="text-[10px]" style={{ color: 'var(--text-5)' }} dir="ltr">{op.shift_start} – {op.shift_end}</span>
                        </div>
                      </div>
                      <a
                        href={`tel:${op.phone.replace(/\s/g, '')}`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs"
                        style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OwnersDashboardPage() {
  const router = useRouter();
  const { toggle, isDark } = useTheme();
  const [tab, setTab] = useState<'requests' | 'maintenance' | 'decrees'>('requests');
  const [requests, setRequests] = useState<PendingGenerator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('generators_pending')
          .select('*, pending_operators(*)')
          .order('created_at', { ascending: false });
        if (Array.isArray(data)) setRequests(data);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const TABS = [
    { id: 'requests' as const,    label: 'طلباتي',    icon: Clock,    count: requests.length },
    { id: 'maintenance' as const, label: 'سجل الصيانة', icon: Wrench,  count: MOCK_LOGS.length },
    { id: 'decrees' as const,     label: 'القرارات الرسمية', icon: FileText, count: MOCK_DECREES.length },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 backdrop-blur-xl"
        style={{
          background: isDark ? 'rgba(10,10,20,0.85)' : 'rgba(255,255,255,0.85)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <button
          onClick={() => router.push('/owners')}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--text-3)' }}
        >
          رجوع
          <ArrowRight className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
          لوحة تحكم المالك
        </h1>
        <button
          onClick={toggle}
          className="p-2 rounded-full transition-all"
          style={{
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            color: 'var(--text-1)',
          }}
        >
          {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 py-4 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: active ? 'rgba(16,185,129,0.12)' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                color: active ? '#10b981' : 'var(--text-4)',
                border: `1px solid ${active ? 'rgba(16,185,129,0.25)' : 'transparent'}`,
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px]"
                style={{
                  background: active ? 'rgba(16,185,129,0.2)' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  color: active ? '#10b981' : 'var(--text-5)',
                }}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <AnimatePresence mode="wait">
            {/* ── Requests tab ── */}
            {tab === 'requests' && (
              <motion.div
                key="requests"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {loading ? (
                  <div className="glass-card p-10 text-center">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-400 mb-3" />
                    <p className="text-sm" style={{ color: 'var(--text-4)' }}>جاري التحميل...</p>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="glass-card p-10 text-center">
                    <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-5)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>لا توجد طلبات</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-5)' }}>يمكنك إضافة مولدة جديدة من البوابة الرئيسية</p>
                  </div>
                ) : (
                  requests.map((gen) => <PendingCard key={gen.id} gen={gen} />)
                )}
              </motion.div>
            )}

            {/* ── Maintenance tab ── */}
            {tab === 'maintenance' && (
              <motion.div
                key="maintenance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {MOCK_LOGS.map((log) => (
                  <div key={log.id} className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}
                      >
                        <Wrench className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{log.type}</p>
                        <p className="text-xs" style={{ color: 'var(--text-5)' }}>{log.generator} — {log.date}</p>
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{log.description}</p>
                  </div>
                ))}
              </motion.div>
            )}

            {/* ── Decrees tab ── */}
            {tab === 'decrees' && (
              <motion.div
                key="decrees"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {MOCK_DECREES.map((decree) => (
                  <div key={decree.id} className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
                      >
                        <FileText className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{decree.title}</p>
                        <p className="text-xs" style={{ color: 'var(--text-5)' }}>{decree.date}</p>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{decree.body}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
