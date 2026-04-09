'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, Info, CheckCircle2, Zap, WifiOff, Thermometer, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type NType = 'fault' | 'warning' | 'info' | 'success';

interface Notif {
  id: number;
  type: NType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  Icon: React.ElementType;
}

const ICON_MAP: Record<string, React.ElementType> = {
  WifiOff, Thermometer, Zap, AlertTriangle, Info, CheckCircle2, Bell,
};

const TYPE_CFG: Record<NType, { bg: string; border: string; text: string; label: string }> = {
  fault:   { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   text: '#ef4444', label: 'عطل'   },
  warning: { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', text: '#f97316', label: 'تحذير' },
  info:    { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  text: '#3b82f6', label: 'معلومة'},
  success: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', text: '#10b981', label: 'نجاح'  },
};

type Tab = 'all' | 'unread' | 'fault';

function rowToNotif(row: Record<string, unknown>): Notif {
  const type = (row.type as string) as NType;
  return {
    id:    row.id as number,
    type,
    title: row.title as string,
    body:  row.body as string,
    time:  row.time_label as string,
    read:  row.read as boolean,
    Icon:  ICON_MAP[row.icon as string] ?? Bell,
  };
}

export default function NotificationsPage() {
  const [notifs, setNotifs]  = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]        = useState<Tab>('all');

  useEffect(() => {
    supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setNotifs((data ?? []).map(rowToNotif));
        setLoading(false);
      });
  }, []);

  const filtered = notifs.filter((n) => {
    if (tab === 'unread') return !n.read;
    if (tab === 'fault')  return n.type === 'fault';
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
          <h1 className="text-xl font-bold text-[var(--text-1)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>الإشعارات</h1>
          <p className="text-sm text-[var(--text-4)] mt-0.5" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
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
        {([['all', 'الكل'], ['unread', 'غير مقروء'], ['fault', 'أعطال']] as [Tab, string][]).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="px-3 py-1.5 rounded-lg text-sm transition-all"
            style={{
              fontFamily: 'var(--font-ibm-arabic)',
              background: tab === k ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: tab === k ? 'var(--text-1)' : 'var(--text-4)',
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-[var(--text-4)] border-t-transparent animate-spin" />
          </div>
        )}
        <AnimatePresence initial={false}>
          {!loading && filtered.map((n, i) => {
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
                      <p className="text-sm font-semibold text-[var(--text-1)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                        {n.title}
                      </p>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: `${cfg.text}20`, color: cfg.text, fontFamily: 'var(--font-ibm-arabic)' }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-4)] leading-relaxed" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                      {n.body}
                    </p>
                    <p className="text-[10px] text-[var(--text-5)] mt-1">{n.time}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                    className="text-[var(--text-5)] hover:text-[var(--text-1)] transition-colors flex-shrink-0 mt-0.5"
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
            <Bell className="w-10 h-10 text-[var(--text-5)] mx-auto mb-3" />
            <p className="text-[var(--text-5)] text-sm" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
              لا توجد إشعارات
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
