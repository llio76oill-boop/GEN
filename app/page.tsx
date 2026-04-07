'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedBackground from '@/components/landing/AnimatedBackground';
import AuthContainer from '@/components/landing/AuthContainer';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const PORTAL_ROUTES: Record<string, string> = {
  admin:    '/dashboard',
  operator: '/owners',
  citizen:  '/citizen',
};

export default function HomePage() {
  const router = useRouter();
  const [activePortal, setActivePortal] = useState<string | null>(null);
  const { toggle, isDark } = useTheme();

  const handlePortalClick = (portalId: string) => {
    setActivePortal(portalId);
    const dest = PORTAL_ROUTES[portalId] ?? '/dashboard';
    setTimeout(() => router.push(dest), 900);
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden flex flex-col lg:flex-row bg-[var(--background)] theme-transitioning">
      
      {/* Theme Toggle Button (Top Left) */}
      <button
        onClick={toggle}
        className="absolute top-6 left-6 z-50 p-3 rounded-full transition-all shadow-lg backdrop-blur-md"
        style={{ 
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          color: 'var(--text-1)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
        }}
        title={isDark ? 'تحويل للوضع الفاتح' : 'تحويل للوضع الداكن'}
      >
        {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
      </button>

      {/* Left side: Buttons & Controls (اليسار) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative min-h-[50vh] lg:min-h-screen order-2 lg:order-1">
        <AnimatedBackground />
        <AuthContainer onPortalClick={handlePortalClick} activePortal={activePortal} isDark={isDark} />
      </div>

      {/* Right side: White area with Anbar Logo (اليمين) */}
      <div 
        className="w-full lg:w-1/2 bg-white flex flex-col items-center justify-center p-12 min-h-[50vh] lg:min-h-screen relative z-40 order-1 lg:order-2 shadow-[-20px_0_50px_rgba(0,0,0,0.05)] border-b lg:border-b-0 lg:border-l border-gray-100" 
        style={{ direction: 'rtl' }}
      >
        <div className="max-w-md text-center space-y-8">
          <img 
            src="https://j.top4top.io/p_3749e3ihh1.png" 
            alt="شعار محافظة الانبار" 
            className="w-full max-w-[280px] mx-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
          />
          <div className="space-y-4">
             <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 tracking-tight" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
               محافظة الأنبار
             </h2>
             <div className="h-1 w-20 bg-emerald-500 mx-auto rounded-full"></div>
             <p className="text-slate-500 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
               البوابة الإلكترونية الموحدة لإدارة ومتابعة منظومة الشبكة الكهربائية والمولدات الأهلية
             </p>
          </div>
        </div>
      </div>

    </main>
  );
}
