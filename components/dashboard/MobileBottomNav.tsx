'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Map, Activity, Bell, Settings } from 'lucide-react';

const TABS = [
  { icon: LayoutDashboard, label: 'الرئيسية',  href: '/dashboard' },
  { icon: Map,             label: 'الخريطة',    href: '/dashboard/map' },
  { icon: Activity,        label: 'الأعطال',    href: '/dashboard/faults',        badge: 7 },
  { icon: Bell,            label: 'الإشعارات',  href: '/dashboard/notifications', badge: 12 },
  { icon: Settings,        label: 'الإعدادات',  href: '/dashboard/settings' },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 flex md:hidden items-stretch justify-around"
      style={{
        background: 'var(--bg-sidebar)',
        backdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid var(--border-subtle)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={false}
            className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 touch-action-manipulation select-none"
            style={{
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Active indicator pill */}
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
              {tab.badge && (
                <span className="absolute -top-1.5 -right-2.5 text-[9px] bg-red-500 text-white rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-medium leading-none">
                  {tab.badge}
                </span>
              )}
            </span>

            <span
              className="text-[10px] leading-tight"
              style={{
                color: active ? '#10b981' : 'var(--text-5)',
                fontFamily: 'var(--font-ibm-arabic)',
                fontWeight: active ? 600 : 400,
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
