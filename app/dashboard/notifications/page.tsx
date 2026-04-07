'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, Info, CheckCircle2, Zap, WifiOff, Thermometer, X } from 'lucide-react';

type NType = 'critical' | 'warning' | 'info' | 'success';

interface Notif {
  id: number;
  type: NType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  Icon: React.ElementType;
}

const SEED_NOTIFS: Notif[] = [
  { id: 1,  type: 'critical', title: 'عطل حرج — مولد G-0482',    body: 'انقطاع الاتصال المفاجئ في حي الأندلس. آخر قراءة: 320 KW',   time: 'منذ 2 د',  read: false, Icon: WifiOff },
  { id: 2,  type: 'critical', title: 'إفراط في الحرارة — G-1204', body: 'درجة حرارة المولد وصلت 95°C في حي المعارف',                  time: 'منذ 5 د',  read: false, Icon: Thermometer },
  { id: 3,  type: 'warning',  title: 'تذبذب في الجهد — G-2891',   body: 'تقلبات متكررة في الجهد بين 200–240V في حي التميم',           time: 'منذ 12 د', read: false, Icon: Zap },
  { id: 4,  type: 'warning',  title: 'انخفاض الوقود — G-0930',    body: 'مستوى الوقود أقل من 15% في حي الكرامة',                     time: 'منذ 18 د', read: true,  Icon: AlertTriangle },
  { id: 5,  type: 'info',     title: 'صيانة مجدولة — G-1563',     body: 'موعد الصيانة الدورية خلال 48 ساعة في حي النهضة',            time: 'منذ 25 د', read: true,  Icon: Info },
  { id: 6,  type: 'success',  title: 'تم استعادة المولد — G-0310', body: 'عاد المولد إلى العمل بعد الصيانة. الطاقة: 420 KW',           time: 'منذ 34 د', read: true,  Icon: CheckCircle2 },
  { id: 7,  type: 'warning',  title: 'عطل في الحساس — G-2240',     body: 'قراءات غير طبيعية من حساس الجهد في حي الجزيرة',            time: 'منذ 45 د', read: true,  Icon: AlertTriangle },
  { id: 8,  type: 'info',     title: 'تحديث البرنامج الثابت',     body: 'يتوفر تحديث جديد v2.0.27 لوحدات التحكم. الرجاء المراجعة',   time: 'منذ 1 س',  read: true,  Icon: Info },
  { id: 9,  type: 'success',  title: 'اكتمال الربط بالشبكة',      body: '12 مولد جديد تم ربطه بالشبكة الوطنية في حي الحوز',          time: 'منذ 2 س',  read: true,  Icon: CheckCircle2 },
  { id: 10, type: 'critical', title: 'انقطاع كامل — منطقة الحوز', body: '8 مولدات خرجت عن الخدمة في وقت واحد. فريق الطوارئ مُبلَّغ', time: 'منذ 3 س',  read: true,  Icon: WifiOff },
];

const TYPE_CFG: Record<NType, { bg: string; border: string; text: string; label: string }> = {
  critical: { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   text: '#ef4444', label: 'حرج'   },
  warning:  { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', text: '#f97316', label: 'تحذير' },
  info:     { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  text: '#3b82f6', label: 'معلومة'},
  success:  { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', text: '#10b981', label: 'نجاح'  },
};

type Tab = 'all' | 'unread' | 'critical';

export default function NotificationsPage() {
  const [notifs, setNotifs]  = useState<Notif[]>(SEED_NOTIFS);
  const [tab, setTab]        = useState<Tab>('all');

  const filtered = notifs.filter((n) => {
    if (tab === 'unread')   return !n.read;
    if (tab === 'critical') return n.type === 'critical';
    return true;
  });

  const unreadCount = notifs.filter((n) => !n.read).length;

  const markRead = (id: number) =>
    setNotifs((p) => p.map((n) => n.id === id ? { ...n, read: true } : n));

  const dismiss = (id: number) =>
    setNotifs((p) => p.filter((n) => n.id !== id));

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>الإشعارات</h1>
          <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            {unreadCount} إشعار غير مقروء
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => setNotifs((p) => p.map((n) => ({ ...n, read: true })))}
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            style={{ fontFamily: 'var(--font-ibm-arabic)' }}
          >
            قراءة الكل
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 glass-card p-1 w-fit">
        {([['all', 'الكل'], ['unread', 'غير مقروء'], ['critical', 'حرجة']] as [Tab, string][]).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="px-3 py-1.5 rounded-lg text-sm transition-all"
            style={{
              fontFamily: 'var(--font-ibm-arabic)',
              background: tab === k ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: tab === k ? 'white' : '#6b7280',
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {filtered.map((n, i) => {
            const cfg = TYPE_CFG[n.type];
            const Icon = n.Icon;
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ delay: i * 0.03 }}
                className="relative rounded-2xl p-4 cursor-pointer"
                style={{ background: cfg.bg, border: `1px solid ${n.read ? 'rgba(255,255,255,0.05)' : cfg.border}` }}
                onClick={() => markRead(n.id)}
              >
                {!n.read && (
                  <span
                    className="absolute top-4 start-4 w-2 h-2 rounded-full block"
                    style={{ background: cfg.text, boxShadow: `0 0 6px ${cfg.text}80` }}
                  />
                )}
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${cfg.text}20` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: cfg.text }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                        {n.title}
                      </p>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: `${cfg.text}20`, color: cfg.text, fontFamily: 'var(--font-ibm-arabic)' }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                      {n.body}
                    </p>
                    <p className="text-[10px] text-gray-700 mt-1">{n.time}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                    className="text-gray-700 hover:text-white transition-colors flex-shrink-0 mt-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Bell className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-600 text-sm" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
              لا توجد إشعارات
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
