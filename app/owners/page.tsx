'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Plus, LogIn, ArrowRight, Loader2, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function OwnersPortalPage() {
  const router = useRouter();
  const { toggle, isDark } = useTheme();
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = (action: 'add' | 'login') => {
    setLoading(action);
    const dest = action === 'add' ? '/owners/add' : '/owners/dashboard';
    setTimeout(() => router.push(dest), 700);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)', top: '-10%', right: '-10%' }}
          animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)', bottom: '-10%', left: '-5%' }}
          animate={{ scale: [1, 1.15, 1], x: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="absolute top-6 left-6 z-50 p-3 rounded-full transition-all shadow-lg backdrop-blur-md"
        style={{
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          color: 'var(--text-1)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        }}
      >
        {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
      </button>

      {/* Back to landing */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all backdrop-blur-md"
        style={{
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          color: 'var(--text-3)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        }}
      >
        الرئيسية
        <ArrowRight className="w-4 h-4" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg"
      >
        <div
          className="glass-card p-8 sm:p-10"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 180, damping: 14 }}
              className="relative w-20 h-20 mx-auto mb-5"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 opacity-20 blur-xl" />
              <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-blue-400/15 to-cyan-500/15 border border-blue-400/25 flex items-center justify-center">
                <Zap className="w-10 h-10 text-blue-400" />
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-2xl font-bold mb-2"
              style={{ color: 'var(--text-1)' }}
            >
              بوابة أصحاب المولدات
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="text-sm"
              style={{ color: 'var(--text-4)' }}
            >
              إدارة أصول التوليد والبيانات التشغيلية
            </motion.p>
          </div>

          {/* Action buttons */}
          <div className="space-y-4">
            {/* Add new generator */}
            <motion.button
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.02, x: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAction('add')}
              disabled={loading !== null}
              className="w-full relative group flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 cursor-pointer text-start"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(59,130,246,0.08))',
                border: '1px solid rgba(16,185,129,0.25)',
              }}
            >
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                {loading === 'add' ? (
                  <Loader2 className="w-7 h-7 text-white animate-spin" />
                ) : (
                  <Plus className="w-7 h-7 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold mb-1" style={{ color: 'var(--text-1)' }}>
                  إضافة مولدة جديدة
                </p>
                <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                  تسجيل مولدة وإرسال طلب الموافقة للإدارة
                </p>
              </div>
            </motion.button>

            {/* Login to dashboard */}
            <motion.button
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02, x: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAction('login')}
              disabled={loading !== null}
              className="w-full relative group flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 cursor-pointer text-start"
              style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                {loading === 'login' ? (
                  <Loader2 className="w-7 h-7 text-white animate-spin" />
                ) : (
                  <LogIn className="w-7 h-7 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold mb-1" style={{ color: 'var(--text-1)' }}>
                  تسجيل الدخول
                </p>
                <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                  الدخول إلى لوحة إدارة المولدات الخاصة بك
                </p>
              </div>
            </motion.button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-5 text-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <p className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--text-5)' }}>
              S.P.G.M.S &nbsp;•&nbsp; بوابة أصحاب المولدات
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
