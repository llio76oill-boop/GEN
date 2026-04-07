'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Search, Bell, Settings, X, Command, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { toggle, isDark } = useTheme();
  const router = useRouter();
  const NOTIF_COUNT = 19;

  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
  const hoverBg = 'var(--surface-hover)';

  return (
    <header
      className="h-16 flex items-center gap-3 px-4 flex-shrink-0"
      style={{
        background:     'var(--bg-header)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Menu toggle */}
      <button
        onClick={onMenuToggle}
        className="p-2 rounded-xl transition-colors flex-shrink-0"
        style={{ color: 'var(--text-4)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = 'var(--text-1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-4)'; }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumb */}
      <div
        className="hidden sm:flex items-center gap-1.5 text-sm flex-shrink-0"
        style={{ fontFamily: 'var(--font-ibm-arabic)', color: 'var(--text-5)' }}
      >
        <span>الشبكة الذكية</span>
        <span style={{ color: 'var(--text-5)' }}>/</span>
        <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>لوحة التحكم</span>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <AnimatePresence mode="wait">
        {searchOpen ? (
          <motion.div
            key="search-open"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative overflow-hidden flex-shrink-0"
          >
            <input
              autoFocus
              type="text"
              placeholder="ابحث: مولد، منطقة، عطل..."
              className="w-full px-4 py-2 text-sm rounded-xl outline-none transition-colors"
              style={{
                background: 'var(--bg-nav-hover)',
                border: '1px solid var(--border-normal)',
                color:        'var(--text-1)',
                fontFamily:   'var(--font-ibm-arabic)',
              }}
            />
            <button
              onClick={() => setSearchOpen(false)}
              className="absolute top-1/2 -translate-y-1/2 end-2 transition-colors"
              style={{ color: 'var(--text-4)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="search-closed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm flex-shrink-0 transition-colors"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color:      'var(--text-4)',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            <Search className="w-4 h-4" />
            <span className="hidden md:inline">بحث...</span>
            <kbd
              className="hidden md:inline flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
            >
              <Command className="w-2.5 h-2.5 inline" />K
            </kbd>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Live badge */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl flex-shrink-0"
        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse block" />
        <span className="text-xs text-emerald-400 font-medium" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
          مباشر
        </span>
      </div>

      {/* Dark/Light toggle */}
      <button
        onClick={toggle}
        className="p-2 rounded-xl transition-colors flex-shrink-0"
        style={{ color: 'var(--text-4)' }}
        title={isDark ? 'تحويل للوضع الفاتح' : 'تحويل للوضع الداكن'}
        onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = '#f59e0b'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-4)'; }}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Notifications */}
      <Link href="/dashboard/notifications">
        <button
          className="relative p-2 rounded-xl transition-colors flex-shrink-0"
          style={{ color: 'var(--text-4)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = 'var(--text-1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-4)'; }}
        >
          <Bell className="w-5 h-5" />
          {NOTIF_COUNT > 0 && (
            <span className="absolute top-1 end-1 w-4 h-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center font-bold leading-none">
              {NOTIF_COUNT > 9 ? '9+' : NOTIF_COUNT}
            </span>
          )}
        </button>
      </Link>

      {/* Settings */}
      <Link href="/dashboard/settings">
        <button
          className="p-2 rounded-xl transition-colors flex-shrink-0"
          style={{ color: 'var(--text-4)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = 'var(--text-1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-4)'; }}
        >
          <Settings className="w-5 h-5" />
        </button>
      </Link>

      {/* Avatar */}
      <button
        onClick={() => router.push('/dashboard/security')}
        className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/40 to-blue-500/40 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 transition-all hover:ring-2 hover:ring-purple-400/30"
        style={{ border: '1px solid var(--border-normal)' }}
      >
        SA
      </button>
    </header>
  );
}






