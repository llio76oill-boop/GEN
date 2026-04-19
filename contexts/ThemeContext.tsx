'use client';

import { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';
export type FontSize = 'normal' | 'medium' | 'large';

const FONT_SCALE: Record<FontSize, number> = { normal: 100, medium: 112, large: 126 };
const FONT_SIZES: FontSize[] = ['normal', 'medium', 'large'];

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
  isDark: boolean;
  fontSize: FontSize;
  cycleFontSize: () => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'dark',
  toggle: () => {},
  isDark: true,
  fontSize: 'normal',
  cycleFontSize: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [fontSize, setFontSize] = useState<FontSize>('normal');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('spgms-theme') as Theme | null;
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
    const savedFont = localStorage.getItem('spgms-font') as FontSize | null;
    if (savedFont && FONT_SIZES.includes(savedFont)) setFontSize(savedFont);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('spgms-theme', theme);
    // Temporarily enable smooth transitions only during theme switch
    document.body.classList.add('theme-transitioning');
    const t = setTimeout(() => document.body.classList.remove('theme-transitioning'), 350);
    return () => clearTimeout(t);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.style.fontSize = `${FONT_SCALE[fontSize]}%`;
    localStorage.setItem('spgms-font', fontSize);
  }, [fontSize, mounted]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  const cycleFontSize = () =>
    setFontSize((f) => FONT_SIZES[(FONT_SIZES.indexOf(f) + 1) % FONT_SIZES.length]);

  return (
    <ThemeContext.Provider value={{ theme, toggle, isDark: theme === 'dark', fontSize, cycleFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
