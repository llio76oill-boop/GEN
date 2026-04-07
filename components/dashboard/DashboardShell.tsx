'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import { useTheme } from '@/contexts/ThemeContext';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useTheme(); // subscribe so shell re-renders on theme change

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar isOpen={sidebarOpen} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-5 pb-20 md:pb-4">
          {children}
        </main>
      </div>
      {/* Bottom nav — shown on mobile only */}
      <MobileBottomNav />
    </div>
  );
}
