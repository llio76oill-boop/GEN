'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Thermometer, Zap, AlertTriangle, RefreshCw, Phone, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Severity = 'critical' | 'warning' | 'info';

interface Fault {
  id: number;
  gId: string;
  location: string;
  type: string;
  severity: Severity;
  timeLabel: string;
  Icon: React.ElementType;
}

const SEV: Record<Severity, { bg: string; border: string; text: string; badge: string }> = {
  critical: { bg: 'rgba(239,68,68,0.07)',   border: 'rgba(239,68,68,0.22)',   text: '#ef4444', badge: 'حرج'    },
  warning:  { bg: 'rgba(249,115,22,0.07)',  border: 'rgba(249,115,22,0.22)',  text: '#f97316', badge: 'تحذير'  },
  info:     { bg: 'rgba(59,130,246,0.07)',  border: 'rgba(59,130,246,0.22)',  text: '#3b82f6', badge: 'معلومة' },
};

const ICON_MAP: Record<string, React.ElementType> = {
  WifiOff,
  Thermometer,
  Zap,
  AlertTriangle,
  RefreshCw,
};

function rowToFault(row: Record<string, unknown>): Fault {
  return {
    id:        row.id as number,
    gId:       row.g_id as string,
    location:  row.location as string,
    type:      row.type as string,
    severity:  row.severity as Severity,
    timeLabel: row.time_label as string,
    Icon:      ICON_MAP[row.icon as string] ?? AlertTriangle,
  };
}

export default function FaultFeed() {
  const [faults, setFaults] = useState<Fault[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolved, setResolved] = useState<Set<number>>(new Set());

  useEffect(() => {
    supabase
      .from('faults')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(25)
      .then(({ data }) => {
        setFaults((data ?? []).map(rowToFault));
        setLoading(false);
      });
  }, []);

  const handleResolve = (id: number) => {
    setResolved((prev) => new Set(prev).add(id));
    setTimeout(() => setFaults((prev) => prev.filter((f) => f.id !== id)), 600);
  };

  return (
    <div
      className="flex-1 flex flex-col rounded-2xl overflow-hidden shadow-lg transition-colors"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse block" />
          <span
            className="text-sm font-semibold text-[var(--text-1)]"
            style={{ fontFamily: 'var(--font-ibm-arabic)' }}
          >
            الأعطال النشطة
          </span>
        </div>
        <span
          className="text-[11px] text-[var(--text-4)] bg-[var(--surface-hover)] px-2 py-0.5 rounded-full"
          style={{ fontFamily: 'var(--font-ibm-arabic)' }}
        >
          {faults.length} عطل
        </span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {loading && (
          <div className="flex items-center justify-center h-full py-12">
            <div className="w-6 h-6 rounded-full border-2 border-[var(--text-4)] border-t-transparent animate-spin" />
          </div>
        )}
        {!loading && faults.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 gap-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
            <p className="text-sm text-[var(--text-4)]" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
              لا توجد أعطال نشطة
            </p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {faults.map((fault) => {
            const s      = SEV[fault.severity];
            const Icon   = fault.Icon;
            const isResolved = resolved.has(fault.id);

            return (
              <motion.div
                key={fault.id}
                layout
                initial={{ opacity: 0, x: -14, height: 0 }}
                animate={{ opacity: isResolved ? 0 : 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="rounded-xl p-3 overflow-hidden"
                style={{
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                }}
              >
                {/* Top row */}
                <div className="flex items-start gap-2.5 mb-2">
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${s.text}18` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: s.text }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="text-xs font-bold text-[var(--text-1)]">{fault.gId}</span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: `${s.text}20`, color: s.text }}
                      >
                        {s.badge}
                      </span>
                    </div>
                    <p
                      className="text-[11px] text-[var(--text-3)] truncate"
                      style={{ fontFamily: 'var(--font-ibm-arabic)' }}
                    >
                      {fault.location}
                    </p>
                    <p
                      className="text-[11px] text-[var(--text-4)]"
                      style={{ fontFamily: 'var(--font-ibm-arabic)' }}
                    >
                      {fault.type}
                    </p>
                  </div>

                  <span className="text-[10px] text-[var(--text-5)] flex-shrink-0 mt-0.5"
                        style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                    {fault.timeLabel}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 pt-2 transition-colors" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <button
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors text-[11px] text-[var(--text-3)] hover:text-[var(--text-1)]" style={{ fontFamily: "var(--font-ibm-arabic)", background: "var(--bg-nav-hover)", border: "1px solid var(--border-subtle)" }}
                  >
                    <RefreshCw className="w-3 h-3" />
                    تشخيص
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors text-[11px] text-[var(--text-3)] hover:text-[var(--text-1)]" style={{ fontFamily: "var(--font-ibm-arabic)", background: "var(--bg-nav-hover)", border: "1px solid var(--border-subtle)" }}
                  >
                    <Phone className="w-3 h-3" />
                    تواصل
                  </button>
                  <button
                    onClick={() => handleResolve(fault.id)}
                    className="w-8 h-[30px] flex items-center justify-center rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 transition-colors flex-shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}