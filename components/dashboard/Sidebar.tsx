'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Map, BarChart3, Zap, Settings,
  FileText, Bell, ShieldCheck, Activity, Users, Globe, Cpu, Gauge, DollarSign,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const NAV = [
  { icon: LayoutDashboard, label: 'لوحة التحكم',      href: '/dashboard',                   badge: null,  external: false },
  { icon: Map,             label: 'الخريطة الحية',    href: '/dashboard/map',               badge: null,  external: false },
  { icon: Activity,        label: 'مركز الأعطال',     href: '/dashboard/faults',            badge: 7,     external: false },
  { icon: BarChart3,       label: 'التحليلات',         href: '/dashboard/analytics',        badge: null,  external: false },
  { icon: Zap,             label: 'المولدات',          href: '/dashboard/generators',       badge: null,  external: false },
  { icon: Users,           label: 'أصحاب المولدات',   href: '/dashboard/owners',            badge: null,  external: false },
  { icon: DollarSign,      label: 'التسعير والفواتير', href: '/dashboard/billing',           badge: null,  external: false },
  { icon: Cpu,             label: 'لوحة الإرسال الحي',            href: '/dashboard/thingsboard',  badge: 'LIVE', external: false },
  { icon: Gauge,           label: 'مركز القيادة والسيطرة',         href: '/dashboard/thingspeak',   badge: 'LIVE', external: false },
  { icon: Bell,            label: 'الإشعارات',         href: '/dashboard/notifications',    badge: 12,    external: false },
  { icon: ShieldCheck,     label: 'الأمان والوصول',   href: '/dashboard/security',          badge: null,  external: false },
  { icon: FileText,        label: 'التوثيق والسجلات', href: '/dashboard/docs',              badge: null,  external: false },
  { icon: Settings,        label: 'الإعدادات',         href: '/dashboard/settings',         badge: null,  external: false },
];

const CITIZEN = { icon: Globe, label: 'بوابة المواطن', href: '/citizen' };

export default function Sidebar({ isOpen }: { isOpen: boolean }) {
  const pathname = usePathname();
  const { isDark } = useTheme();

  const sidebarBorder = 'var(--border-subtle)';

  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 232 : 68 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex-shrink-0 h-full flex flex-col overflow-hidden"
      style={{
        background:     'var(--bg-sidebar)',
        backdropFilter: 'blur(24px)',
        borderInlineEnd: `1px solid ${sidebarBorder}`,
      }}
    >
      {/* Logo row */}
      <div
        className="flex items-center gap-3 px-4 h-16 flex-shrink-0"
        style={{ borderBottom: `1px solid ${sidebarBorder}` }}
      >
        <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-emerald-400/20 to-blue-500/20 border border-emerald-400/25 flex items-center justify-center">
          <Zap className="w-5 h-5 text-emerald-400" />
        </div>
        <motion.div
          animate={{ opacity: isOpen ? 1 : 0, width: isOpen ? 'auto' : 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden whitespace-nowrap"
        >
          <p className="text-sm font-semibold leading-none mb-0.5" style={{ color: 'var(--text-1)' }}>S.P.G.M.S</p>
          <p className="text-[10px]" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
            إدارة الطاقة الذكية
          </p>
        </motion.div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: -2 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group"
                style={{
                  background: active
                    ? 'rgba(16,185,129,0.1)'
                    : undefined,
                  border: active
                    ? '1px solid rgba(16,185,129,0.2)'
                    : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'var(--bg-nav-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon
                  className="w-[18px] h-[18px] flex-shrink-0 transition-colors"
                  style={{ color: active ? '#10b981' : 'var(--text-5)' }}
                />
                <motion.div
                  animate={{ opacity: isOpen ? 1 : 0, width: isOpen ? 'auto' : 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex-1 flex items-center justify-between overflow-hidden"
                >
                  <span
                    className="text-sm whitespace-nowrap"
                    style={{
                      color:      active ? '#10b981' : 'var(--text-3)',
                      fontWeight: active ? 500 : 400,
                      fontFamily: 'var(--font-ibm-arabic)',
                    }}
                  >
                    {item.label}
                  </span>
                  {item.badge === 'LIVE' && (
                    <span className="text-[10px] rounded-full px-2 leading-5 font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ●
                    </span>
                  )}
                  {item.badge && item.badge !== 'LIVE' && (
                    <span className="text-[10px] bg-red-500/80 text-white rounded-full px-1.5 leading-5 min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                </motion.div>
              </motion.div>
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-2 mx-3 h-px" style={{ background: sidebarBorder }} />

        {/* Citizen Portal — opens in new tab */}
        <a href={CITIZEN.href} target="_blank" rel="noopener noreferrer">
          <motion.div
            whileHover={{ x: -2 }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer"
            style={{ border: '1px solid transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-nav-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <CITIZEN.icon className="w-[18px] h-[18px] flex-shrink-0" style={{ color: '#3b82f6' }} />
            <motion.div
              animate={{ opacity: isOpen ? 1 : 0, width: isOpen ? 'auto' : 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <span className="text-sm" style={{ color: '#3b82f6', fontFamily: 'var(--font-ibm-arabic)' }}>
                {CITIZEN.label}
              </span>
            </motion.div>
          </motion.div>
        </a>
      </nav>

      {/* User */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: `1px solid ${sidebarBorder}` }}>
        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 flex-shrink-0 rounded-full bg-gradient-to-br from-purple-500/40 to-blue-500/40 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
            SA
          </div>
          <motion.div
            animate={{ opacity: isOpen ? 1 : 0, width: isOpen ? 'auto' : 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden whitespace-nowrap flex-1"
          >
            <p className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Super Admin</p>
            <p className="text-[10px]" style={{ color: 'var(--text-5)' }}>admin@spgms.iq</p>
          </motion.div>
        </div>
      </div>
    </motion.aside>
  );
}


