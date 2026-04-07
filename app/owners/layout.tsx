'use client';

import { ThemeProvider } from '@/contexts/ThemeContext';

export default function OwnersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: 'var(--background)',
        color: 'var(--text-1)',
        direction: 'rtl',
        fontFamily: 'var(--font-ibm-arabic)',
      }}
    >
      {children}
    </div>
  );
}
