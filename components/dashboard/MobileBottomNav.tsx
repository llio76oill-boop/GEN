'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Map, Zap, Activity,
  LayoutGrid, Bell, BarChart3, Users, Cpu,
  ShieldCheck, FileText, Settings, Globe, DollarSign, X,
} from 'lucide-react';

const PRIMARY_TABS = [
  { icon: LayoutDashboard, label: 'الرئيسية', href: '/dashboard' },
  { icon: Map,             label: 'الخريطة',  href: '/dashboard/map' },
  { icon: Zap,             label: 'المولدات', href: '/dashboard/generators' },
  { icon: Activity,        label: 'الأعطال',  href: '/dashboard/faults', badge: 7 },
];

const MORE_ITEMS = [
  { icon: Users,       label: 'أصحاب المولدات',        href: '/dashboard/owners' },
  { icon: BarChart3,   label: 'التحليلات',              href: '/dashboard/analytics' },
  { icon: DollarSign,  label: 'الفواتير والتسعير',      href: '/dashboard/billing' },
  { icon: Cpu,         label: 'مركز بيانات',            href: '/dashboard/thingsboard', badge: 'LIVE' as const },

  { icon: Bell,        label: 'الإشعارات',              href: '/dashboard/notifications', badge: 12 },
  { icon: ShieldCheck, label: 'الأمان',                 href: '/dashboard/security' },
  { icon: FileText,    label: 'التوثيق',                href: '/dashboard/docs' },
  { icon: Settings,    label: 'الإعدادات',              href: '/dashboard/settings' },
  { icon: Globe,       label: 'بوابة المواطن',          href: '/citizen' },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const isMoreActive = MORE_ITEMS.some((i) => pathname === i.href);

  return (
    <>
      {/* ── Bottom Tab Bar ── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 flex md:hidden items-stretch justify-around"
        style={{
          background: 'var(--bg-sidebar)',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderTop: '1px solid var(--border-subtle)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {PRIMARY_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={false}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 select-none"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full"
                  style={{ background: '#10b981' }}
                />
              )}
              <span className="relative">
                <Icon
                  className="w-[22px] h-[22px] transition-colors"
                  style={{ color: active ? '#10b981' : 'var(--text-4)' }}
                />
                {'badge' in tab && tab.badge && (
                  <span className="absolute -top-1.5 -right-2.5 text-[9px] bg-red-500 text-white rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-medium leading-none">
                    {tab.badge}
                  </span>
                )}
              </span>
              <span
                className="text-[10px] leading-tight"
                style={{ color: active ? '#10b981' : 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)', fontWeight: active ? 600 : 400 }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 select-none"
          style={{ WebkitTapHighlightColor: 'transparent', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {isMoreActive && (
            <span
              className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full"
              style={{ background: '#10b981' }}
            />
          )}
          <LayoutGrid
            className="w-[22px] h-[22px] transition-colors"
            style={{ color: isMoreActive ? '#10b981' : 'var(--text-4)' }}
          />
          <span
            className="text-[10px] leading-tight"
            style={{ color: isMoreActive ? '#10b981' : 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)', fontWeight: isMoreActive ? 600 : 400 }}
          >
            المزيد
          </span>
        </button>
      </nav>

      {/* ── More Drawer ── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[60] md:hidden"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />

            {/* Drawer sheet */}
            <motion.div
              className="fixed bottom-0 inset-x-0 z-[70] md:hidden rounded-t-[28px] overflow-hidden"
              style={{ background: 'var(--bg-sidebar)', borderTop: '1px solid var(--border-subtle)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 42 }}
              dir="rtl"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-normal)' }} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <p className="text-sm font-bold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>
                  جميع الأقسام
                </p>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-4)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid */}
              <div
                className="grid grid-cols-3 gap-3 p-4 overflow-y-auto"
                style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))', maxHeight: '65vh' }}
              >
                {MORE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="relative flex flex-col items-center gap-2 p-3 rounded-2xl text-center transition-all active:scale-95"
                      style={{
                        background: active ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                        border: active ? '1px solid rgba(16,185,129,0.22)' : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center relative"
                        style={{ background: active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.07)' }}
                      >
                        <Icon className="w-5 h-5" style={{ color: active ? '#10b981' : 'var(--text-4)' }} />
                        {item.badge === 'LIVE' && (
                          <span
                            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2"
                            style={{ background: '#10b981', borderColor: 'var(--bg-sidebar)' }}
                          />
                        )}
                        {typeof item.badge === 'number' && (
                          <span className="absolute -top-1.5 -right-2 text-[9px] bg-red-500 text-white rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center font-medium leading-none">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span
                        className="text-[11px] leading-snug"
                        style={{ color: active ? '#10b981' : 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)', fontWeight: active ? 600 : 400 }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
