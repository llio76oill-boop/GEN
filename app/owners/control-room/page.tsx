'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Power,
  Timer,
  DollarSign,
  Gauge,
  Fuel,
  ArrowRight,
  Sun,
  Moon,
  AlertTriangle,
  Zap,
  Activity,
  LayoutDashboard,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useSessionTimer, RATE_PER_HOUR } from '@/hooks/useSessionTimer';
import { OWNERS } from '@/data/owners';

/* ── Formatting helpers ── */
function formatTime(totalSeconds: number): { h: string; m: string; s: string } {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return {
    h: String(h).padStart(2, '0'),
    m: String(m).padStart(2, '0'),
    s: String(s).padStart(2, '0'),
  };
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('ar-IQ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ── Arc Gauge Component ── */
function ArcGauge({ pct, color, label, value }: { pct: number; color: string; label: string; value: string }) {
  const r = 40;
  const cx = 55, cy = 52;
  const sx = cx - r, sy = cy;
  const clampedPct = Math.min(Math.max(pct, 0), 1);
  const ang = 180 * clampedPct;
  const rad = ((ang - 180) * Math.PI) / 180;
  const ex = cx + Math.cos(rad) * r;
  const ey = cy + Math.sin(rad) * r;
  const la = ang > 180 ? 1 : 0;
  return (
    <svg viewBox="0 0 110 72" className="w-full h-auto">
      <path
        d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round"
      />
      <motion.path
        d={`M ${sx} ${sy} A ${r} ${r} 0 ${la} 1 ${ex} ${ey}`}
        fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="15" fontWeight="700" className="fill-[var(--text-1)]">
        {value}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" className="fill-[var(--text-4)]">
        {label}
      </text>
    </svg>
  );
}

/* ── Hold Button Ring Indicator ── */
function HoldProgress({ progress, isRunning }: { progress: number; isRunning: boolean }) {
  const r = 72;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - progress * circumference;

  return (
    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 160 160">
      {/* Background ring */}
      <circle cx="80" cy="80" r={r} fill="none" strokeWidth="4"
        stroke={isRunning ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'} />
      {/* Progress ring */}
      {progress > 0 && (
        <circle cx="80" cy="80" r={r} fill="none" strokeWidth="4"
          stroke={isRunning ? '#ef4444' : '#10b981'}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${isRunning ? '#ef4444' : '#10b981'}80)` }}
        />
      )}
    </svg>
  );
}

/* ── Pulse Rings (when running) ── */
function PulseRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 0.7, 1.4].map((delay, i) => (
        <motion.div
          key={i}
          className="absolute w-44 h-44 rounded-full border-2 border-emerald-400/30"
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{ duration: 2.5, delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/* ── Main Control Room Page ── */
export default function ControlRoomPage() {
  const router = useRouter();
  const { toggle, isDark } = useTheme();

  // Use first owner's first generator as default
  const owner = OWNERS[0];
  const gen = owner.generators[0];

  const {
    isRunning,
    elapsedSeconds,
    liveCost,
    startSession,
    stopSession,
    error,
  } = useSessionTimer(gen.code, owner.name, gen.area);

  const time = formatTime(elapsedSeconds);

  // Hold-to-toggle logic (2 seconds)
  const HOLD_DURATION = 2000;
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdStartRef = useRef<number | null>(null);
  const holdRafRef = useRef<number | null>(null);
  const holdCompletedRef = useRef(false);

  const animateHold = useCallback(() => {
    if (!holdStartRef.current) return;
    const elapsed = Date.now() - holdStartRef.current;
    const progress = Math.min(elapsed / HOLD_DURATION, 1);
    setHoldProgress(progress);

    if (progress >= 1 && !holdCompletedRef.current) {
      holdCompletedRef.current = true;
      if (isRunning) {
        stopSession();
      } else {
        startSession();
      }
      // Vibrate if supported
      if (navigator.vibrate) navigator.vibrate(100);
      cancelHold();
      return;
    }

    holdRafRef.current = requestAnimationFrame(animateHold);
  }, [isRunning, startSession, stopSession]);

  const startHold = useCallback(() => {
    holdStartRef.current = Date.now();
    holdCompletedRef.current = false;
    setIsHolding(true);
    holdRafRef.current = requestAnimationFrame(animateHold);
  }, [animateHold]);

  const cancelHold = useCallback(() => {
    holdStartRef.current = null;
    setIsHolding(false);
    setHoldProgress(0);
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
    };
  }, []);

  // Simulated load & fuel values
  const estimatedLoad = isRunning ? 68 + Math.sin(elapsedSeconds / 30) * 8 : 0;
  const fuelQuotaTotal = 2000; // liters monthly
  const fuelConsumed = isRunning ? Math.min(elapsedSeconds * 0.012, fuelQuotaTotal) : 0;
  const fuelRemaining = fuelQuotaTotal - fuelConsumed;
  const fuelPct = fuelRemaining / fuelQuotaTotal;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* ── Top Bar ── */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 backdrop-blur-xl"
        style={{
          background: isDark ? 'rgba(10,10,20,0.85)' : 'rgba(255,255,255,0.85)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <button
          onClick={() => router.push('/owners')}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--text-3)' }}
        >
          رجوع
          <ArrowRight className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
          غرفة التحكم التشغيلي
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/owners/dashboard')}
            className="p-2 rounded-full transition-all"
            style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              color: 'var(--text-3)',
            }}
            title="لوحة التحكم"
          >
            <LayoutDashboard className="w-4 h-4" />
          </button>
          <button
            onClick={toggle}
            className="p-2 rounded-full transition-all"
            style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              color: 'var(--text-1)',
            }}
          >
            {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>
        </div>
      </div>

      {/* ── Generator Info Strip ── */}
      <div className="px-4 py-3 flex items-center gap-3 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs flex-shrink-0"
          style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}
        >
          <Zap className="w-3.5 h-3.5" />
          {gen.code}
        </div>
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)' }}>{gen.area}</span>
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-4)' }}>{gen.power} KW</span>
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-5)' }}>{owner.name}</span>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 px-4 py-6 overflow-y-auto pb-safe">
        <div className="max-w-lg mx-auto space-y-6">

          {/* ── Error Banner ── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Master Timer ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Timer className="w-4 h-4" style={{ color: isRunning ? '#10b981' : 'var(--text-4)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-4)' }}>
                العداد الأساسي
              </span>
              {isRunning && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-blink block" />
                  <span className="text-[10px] text-emerald-400 font-medium">مباشر</span>
                </span>
              )}
            </div>
            <div className="flex items-center justify-center gap-1 font-mono" dir="ltr">
              {[time.h, time.m, time.s].map((unit, i) => (
                <span key={i} className="flex items-center">
                  {i > 0 && (
                    <span
                      className="text-3xl font-bold mx-1"
                      style={{ color: isRunning ? '#10b981' : 'var(--text-5)', opacity: isRunning ? (elapsedSeconds % 2 === 0 ? 1 : 0.3) : 1 }}
                    >
                      :
                    </span>
                  )}
                  <span
                    className="text-5xl sm:text-6xl font-bold tracking-wider tabular-nums"
                    style={{
                      color: isRunning ? 'var(--text-1)' : 'var(--text-5)',
                      textShadow: isRunning ? '0 0 20px rgba(16,185,129,0.3)' : 'none',
                      fontVariantNumeric: 'tabular-nums',
                      minWidth: '2.5ch',
                      display: 'inline-block',
                    }}
                  >
                    {unit}
                  </span>
                </span>
              ))}
            </div>
            <p className="text-[10px] mt-2" style={{ color: 'var(--text-5)' }}>
              {isRunning ? 'وقت التشغيل الحالي' : 'المولد متوقف'}
            </p>
          </motion.div>

          {/* ── Master Switch ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
            className="flex flex-col items-center py-4"
          >
            <p className="text-xs mb-4 font-medium" style={{ color: 'var(--text-4)' }}>
              {isRunning ? 'اضغط مطولاً لإيقاف المحرك' : 'اضغط مطولاً لتشغيل المحرك'}
            </p>

            <div className="relative w-40 h-40 flex items-center justify-center">
              {/* Pulse rings when running */}
              {isRunning && <PulseRings />}

              {/* Hold progress ring */}
              <HoldProgress progress={holdProgress} isRunning={isRunning} />

              {/* Main button */}
              <motion.button
                onPointerDown={startHold}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                onContextMenu={(e) => e.preventDefault()}
                whileTap={{ scale: 0.95 }}
                className="relative z-10 w-[120px] h-[120px] rounded-full flex flex-col items-center justify-center gap-1.5 transition-all select-none"
                style={{
                  background: isRunning
                    ? 'radial-gradient(circle, rgba(16,185,129,0.25), rgba(16,185,129,0.08))'
                    : 'radial-gradient(circle, rgba(107,114,128,0.15), rgba(107,114,128,0.05))',
                  border: `3px solid ${isRunning ? 'rgba(16,185,129,0.5)' : 'rgba(107,114,128,0.3)'}`,
                  boxShadow: isRunning
                    ? '0 0 40px rgba(16,185,129,0.25), inset 0 0 30px rgba(16,185,129,0.1)'
                    : '0 0 20px rgba(0,0,0,0.2), inset 0 0 15px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                }}
              >
                <Power
                  className="w-10 h-10 transition-colors"
                  style={{
                    color: isRunning ? '#10b981' : 'var(--text-5)',
                    filter: isRunning ? 'drop-shadow(0 0 10px rgba(16,185,129,0.6))' : 'none',
                  }}
                />
                <span
                  className="text-[10px] font-bold tracking-wide"
                  style={{ color: isRunning ? '#10b981' : 'var(--text-5)' }}
                >
                  {isRunning ? 'قيد التشغيل' : 'إيقاف المحرك'}
                </span>
              </motion.button>
            </div>

            {/* Hold instruction */}
            <AnimatePresence>
              {isHolding && (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="text-xs mt-3 font-medium"
                  style={{ color: isRunning ? '#ef4444' : '#10b981' }}
                >
                  {isRunning ? 'استمر بالضغط للإيقاف...' : 'استمر بالضغط للتشغيل...'} ({Math.round(holdProgress * 100)}%)
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Telemetry Bento Grid ── */}
          <div className="grid grid-cols-2 gap-3">

            {/* ── Live Cost Widget ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-4 col-span-2"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.12)' }}>
                  <DollarSign className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-4)' }}>التكلفة اللحظية</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-5)' }}>التسعيرة: ٣٨ دينار/أمبير/ساعة</p>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-4xl font-bold tabular-nums font-mono"
                  dir="ltr"
                  style={{
                    color: isRunning ? '#fbbf24' : 'var(--text-5)',
                    textShadow: isRunning ? '0 0 15px rgba(251,191,36,0.3)' : 'none',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatCurrency(liveCost)}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-4)' }}>
                  دينار عراقي
                </span>
              </div>
              {isRunning && (
                <div className="mt-3 flex items-center gap-4 text-[10px]" style={{ color: 'var(--text-5)' }}>
                  <span>القيمة بالدقيقة: {(RATE_PER_HOUR / 60).toFixed(2)} د.ع</span>
                  <span>·</span>
                  <span>المُراكَم: {Math.floor(elapsedSeconds / 60)} دقيقة</span>
                </div>
              )}
            </motion.div>

            {/* ── Load Gauge ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-4)' }}>
                  القدرة التشغيلية
                </span>
              </div>
              <ArcGauge
                pct={isRunning ? estimatedLoad / 100 : 0}
                color={estimatedLoad > 85 ? '#ef4444' : estimatedLoad > 60 ? '#3b82f6' : '#10b981'}
                label="حمل المحرك"
                value={isRunning ? `${Math.round(estimatedLoad)}%` : '—'}
              />
              {isRunning && (
                <div className="text-center">
                  <p className="text-[10px]" style={{ color: 'var(--text-5)' }}>
                    {Math.round(estimatedLoad * gen.power / 100)} / {gen.power} KW
                  </p>
                </div>
              )}
            </motion.div>

            {/* ── Fuel Capacity ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Fuel className="w-4 h-4 text-orange-400" />
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-4)' }}>
                  حصة الوقود الشهرية
                </span>
              </div>
              <div className="space-y-2 mt-3">
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-4)' }}>المتبقي</span>
                  <span className="font-bold tabular-nums font-mono" dir="ltr" style={{ color: fuelPct > 0.3 ? '#10b981' : fuelPct > 0.1 ? '#f97316' : '#ef4444' }}>
                    {Math.round(fuelRemaining).toLocaleString()} لتر
                  </span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: fuelPct > 0.3
                        ? 'linear-gradient(to left, #10b981, #059669)'
                        : fuelPct > 0.1
                          ? 'linear-gradient(to left, #f97316, #ea580c)'
                          : 'linear-gradient(to left, #ef4444, #dc2626)',
                    }}
                    initial={{ width: '100%' }}
                    animate={{ width: `${fuelPct * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-5)' }}>
                  <span>الحصة: {fuelQuotaTotal.toLocaleString()} لتر</span>
                  <span>المستهلك: {Math.round(fuelConsumed)} لتر</span>
                </div>
              </div>
            </motion.div>

            {/* ── Session Summary ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-card p-4 col-span-2"
            >
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4" style={{ color: isRunning ? '#10b981' : 'var(--text-5)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-4)' }}>ملخص الجلسة</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: 'وقت التشغيل',
                    value: `${time.h}:${time.m}`,
                    unit: 'ساعة:دقيقة',
                    color: '#10b981',
                  },
                  {
                    label: 'التكلفة المُراكَمة',
                    value: formatCurrency(liveCost),
                    unit: 'د.ع',
                    color: '#fbbf24',
                  },
                  {
                    label: 'الطاقة المُقدَّرة',
                    value: isRunning ? `${((estimatedLoad / 100) * gen.power * elapsedSeconds / 3600).toFixed(1)}` : '0',
                    unit: 'KWh',
                    color: '#3b82f6',
                  },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <p
                      className="text-lg font-bold tabular-nums font-mono"
                      dir="ltr"
                      style={{ color: isRunning ? item.color : 'var(--text-5)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {item.value}
                    </p>
                    <p className="text-[9px]" style={{ color: 'var(--text-5)' }}>{item.unit}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-4)' }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
