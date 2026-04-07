'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, Users, ChevronLeft, Loader2 } from 'lucide-react';

interface Props {
  onPortalClick: (id: string) => void;
  activePortal: string | null;
  isDark?: boolean;
}

const PORTALS = [
  {
    id: 'admin',
    title: 'بوابة الإدارة',
    subtitle: 'التحكم الشامل والمركزي بمنظومة الطاقة',
    icon: ShieldAlert,
    gradient: 'from-purple-500 to-indigo-600',
    shadowColor: 'rgba(168,85,247,0.35)',
    borderColor: 'rgba(168,85,247,0.3)',
    accentColor: '#a855f7',
  },
  {
    id: 'operator',
    title: 'بوابة أصحاب المولدات',
    subtitle: 'إدارة أصول التوليد والبيانات التشغيلية',
    icon: Zap,
    gradient: 'from-blue-500 to-cyan-500',
    shadowColor: 'rgba(59,130,246,0.35)',
    borderColor: 'rgba(59,130,246,0.3)',
    accentColor: '#3b82f6',
  },
  {
    id: 'citizen',
    title: 'بوابة المواطنين',
    subtitle: 'الاستعلامات والخدمات العامة',
    icon: Users,
    gradient: 'from-emerald-400 to-teal-500',
    shadowColor: 'rgba(16,185,129,0.35)',
    borderColor: 'rgba(16,185,129,0.3)',
    accentColor: '#10b981',
  },
];

export default function AuthContainer({ onPortalClick, activePortal, isDark = true }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const cardBg = isDark ? 'rgba(255,255,255,0.028)' : 'rgba(255,255,255,0.88)';
  const hoverBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.95)';
  const idleBg = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.6)';
  const borderCol = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  const borderHover = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  
  // Text colors
  const textTitle = 'var(--text-1)';
  const textSub = 'var(--text-4)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 36, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 w-full max-w-md mx-4"
    >
      <div
        className="relative rounded-3xl overflow-hidden p-8 transition-colors duration-300"
        style={{
          background: 'var(--surface)',
          backdropFilter: 'blur(36px) saturate(180%)',
          border: '1px solid var(--border)',
          boxShadow: isDark 
            ? '0 32px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)'
            : '0 32px 64px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)',
        }}
      >
        {/* Top border shine */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Scanning line */}
        <motion.div
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/25 to-transparent pointer-events-none"
          initial={{ top: '0%' }}
          animate={{ top: '100%' }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />

        {/* ── Header ── */}
        <div className="text-center mb-9">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 180, damping: 14 }}
            className="relative w-20 h-20 mx-auto mb-5"
          >
            {/* Glow halo */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 opacity-20 blur-xl" />
            {/* Icon box */}
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-emerald-400/15 to-blue-500/15 border border-emerald-400/25 flex items-center justify-center">
              <Zap className="w-10 h-10 text-emerald-400" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="text-gradient text-2xl font-bold leading-snug mb-1.5"
            style={{ fontFamily: 'var(--font-ibm-arabic), var(--font-geist-sans)' }}
          >
            نظام إدارة الشبكة الكهربائية الذكية
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="text-[11px] tracking-widest uppercase transition-colors"
            style={{ color: textSub }}
          >
            S.P.G.M.S &nbsp;•&nbsp; 3,000 Generator Network
          </motion.p>
        </div>

        {/* ── Portals ── */}
        <div className="space-y-3">
          {PORTALS.map((portal, i) => {
            const Icon = portal.icon;
            const isActive  = activePortal === portal.id;
            const isHovered = hovered === portal.id;

            return (
              <motion.button
                key={portal.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.09, duration: 0.45 }}
                whileHover={{ scale: 1.02, x: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPortalClick(portal.id)}
                onHoverStart={() => setHovered(portal.id)}
                onHoverEnd={() => setHovered(null)}
                className="w-full relative group flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 cursor-pointer text-start"
                style={{
                  background: isHovered || isActive ? hoverBg : idleBg,
                  border: `1px solid ${isHovered || isActive ? portal.borderColor : borderHover}`,
                  boxShadow: isHovered ? `0 0 24px ${portal.shadowColor}` : 'none',
                }}
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${portal.gradient} flex items-center justify-center shadow-lg transition-opacity duration-200`}
                  style={{ opacity: isHovered || isActive ? 1 : 0.7 }}
                >
                  {isActive
                    ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                    : <Icon className="w-6 h-6 text-white" />
                  }
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0 transition-colors">
                  <p
                    className="text-sm font-semibold mb-0.5"
                    style={{ fontFamily: 'var(--font-ibm-arabic), var(--font-geist-sans)', color: textTitle }}
                  >
                    {portal.title}
                  </p>
                  <p
                    className="text-xs truncate transition-colors"
                    style={{ fontFamily: 'var(--font-ibm-arabic), var(--font-geist-sans)', color: textSub }}
                  >
                    {portal.subtitle}
                  </p>
                </div>

                {/* Arrow */}
                <ChevronLeft className="w-4 h-4 group-hover:text-[var(--text-2)] transition-colors flex-shrink-0" style={{ color: 'var(--text-4)' }} />

                {/* Hover bottom sweep */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      exit={{ scaleX: 0 }}
                      className="absolute bottom-0 inset-x-0 h-px origin-end"
                      style={{
                        background: `linear-gradient(to right, transparent, ${portal.accentColor}80, transparent)`,
                      }}
                    />
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="mt-7 pt-5 flex items-center justify-between transition-colors" style={{ borderTop: `1px solid ${borderCol}` }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse block" />
            <span className="text-[10px] transition-colors" style={{ color: textSub }}>Supabase Realtime • متصل</span>
          </div>
          <span className="text-[10px] transition-colors" style={{ color: textSub }}>v2.0.26 • April 2026</span>
        </div>
      </div>
    </motion.div>
  );
}
