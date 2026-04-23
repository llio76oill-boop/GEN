'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useSessionTimer, RATE_PER_HOUR } from '@/hooks/useSessionTimer';
import { supabase } from '@/lib/supabase';
import SubscriberHub from '@/components/owners/SubscriberHub';

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
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

/* ── Main Control Room Page ── */
export default function ControlRoomPage() {
  const router = useRouter();
  const { toggle, isDark } = useTheme();

  // Fetch first registered generator from Supabase
  const [genCode, setGenCode] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [genArea, setGenArea] = useState('');
  const [genPower, setGenPower] = useState(380);
  const [ownedGenId, setOwnedGenId] = useState<number | null>(null);
  const [totalHours, setTotalHours] = useState(0);
  const [thingspeakChannel, setThingspeakChannel] = useState<string | null>(null);
  const [operatorsCount, setOperatorsCount] = useState(0);
  const [loadingOwner, setLoadingOwner] = useState(true);
  const [activeTab, setActiveTab] = useState<'ops' | 'subs'>('ops');

  useEffect(() => {
    supabase
      .from('owned_generators')
      .select('id, code, area, power, total_hours, thingspeak_channel_id, owners(name, phone)')
      .neq('is_mock', true)
      .limit(1)
      .single()
      .then(async ({ data }) => {
        if (data) {
          setGenCode(data.code ?? '');
          setGenArea(data.area ?? '');
          setGenPower(data.power ?? 380);
          setOwnedGenId(data.id ?? null);
          setTotalHours(data.total_hours ?? 0);
          setThingspeakChannel(data.thingspeak_channel_id ?? null);
          const owner = Array.isArray(data.owners) ? data.owners[0] : data.owners;
          setOwnerName((owner as { name?: string })?.name ?? '');
          setOwnerPhone((owner as { phone?: string })?.phone ?? '');
          const { count } = await supabase
            .from('operators')
            .select('id', { count: 'exact', head: true })
            .eq('owned_gen_id', data.id);
          setOperatorsCount(count ?? 0);
        }
        setLoadingOwner(false);
      });
  }, []);

  const {
    isRunning,
    elapsedSeconds,
    liveCost,
    startSession,
    stopSession,
    error,
  } = useSessionTimer(genCode, ownerName, genArea);

  // ── ThingSpeak live voltage ──
  const [voltage, setVoltage]               = useState<number | null>(null);
  const [voltageLoading, setVoltageLoading] = useState(false);
  const [lastVoltageTime, setLastVoltageTime] = useState<string | null>(null);
  const [voltageRefreshTick, setVoltageRefreshTick] = useState(0);
  const isOnline = voltage !== null && voltage > 100;

  // Fetch latest voltage from ThingSpeak
  useEffect(() => {
    if (!thingspeakChannel) return;
    setVoltageLoading(true);
    fetch(`https://api.thingspeak.com/channels/${thingspeakChannel}/fields/1/last.json`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((json) => {
        const v = parseFloat(json.field1 ?? '0');
        setVoltage(isNaN(v) ? null : v);
        if (json.created_at) {
          setLastVoltageTime(new Date(json.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
        }
      })
      .catch(() => setVoltage(null))
      .finally(() => setVoltageLoading(false));
  }, [thingspeakChannel, voltageRefreshTick]);

  // Auto-poll every 30 seconds
  useEffect(() => {
    if (!thingspeakChannel) return;
    const id = setInterval(() => setVoltageRefreshTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [thingspeakChannel]);

  // Auto-manage session: sync with ThingSpeak status
  const sessionRef = useRef({ isRunning, startSession, stopSession });
  useEffect(() => { sessionRef.current = { isRunning, startSession, stopSession }; });
  const prevOnlineRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (voltageLoading || voltage === null) return;
    const was = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;
    const { isRunning: r, startSession: start, stopSession: stop } = sessionRef.current;
    if (was === null) {
      if (isOnline && !r) start();
      else if (!isOnline && r) stop();
    } else if (isOnline && !was && !r) {
      start();
    } else if (!isOnline && was && r) {
      stop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, voltageLoading]);

  const ownerMeta = loadingOwner ? null : {
    name: ownerName,
    phone: ownerPhone,
    genCode,
    genArea,
    ownedGenId,
    totalHours,
    totalOperators: operatorsCount,
    thingspeakChannel,
    isOnline,
  };

  const time = formatTime(elapsedSeconds);

  // Simulated load & fuel values
  const estimatedLoad = isOnline ? 68 + Math.sin(elapsedSeconds / 30) * 8 : 0;
  const fuelQuotaTotal = 2000; // liters monthly
  const fuelConsumed = isOnline ? Math.min(elapsedSeconds * 0.012, fuelQuotaTotal) : 0;
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
          {loadingOwner ? '...' : genCode}
        </div>
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)' }}>{loadingOwner ? '' : genArea}</span>
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-4)' }}>{loadingOwner ? '' : `${genPower} KW`}</span>
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-5)' }}>{loadingOwner ? '' : ownerName}</span>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {(['ops', 'subs'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 text-xs font-bold rounded-xl transition-all"
            style={{
              background: activeTab === tab
                ? (isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)')
                : 'transparent',
              color: activeTab === tab ? '#818cf8' : 'var(--text-4)',
              border: activeTab === tab ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
            }}
          >
            {tab === 'ops' ? '⚙️ التشغيل' : '👥 المشتركون'}
          </button>
        ))}
      </div>

      {/* ── Subscribers Tab ── */}
      {activeTab === 'subs' && (
        <div className="flex-1 px-4 py-5 overflow-y-auto pb-safe">
          <div className="max-w-lg mx-auto">
            <SubscriberHub ownerMeta={ownerMeta} />
          </div>
        </div>
      )}

      {/* ── Operations Tab ── */}
      {activeTab === 'ops' && <div className="flex-1 px-4 py-6 overflow-y-auto pb-safe">
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
              <Timer className="w-4 h-4" style={{ color: isOnline ? '#10b981' : 'var(--text-4)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-4)' }}>
                العداد الأساسي
              </span>
              {isOnline && (
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
                      style={{ color: isOnline ? '#10b981' : 'var(--text-5)', opacity: isOnline ? (elapsedSeconds % 2 === 0 ? 1 : 0.3) : 1 }}
                    >
                      :
                    </span>
                  )}
                  <span
                    className="text-5xl sm:text-6xl font-bold tracking-wider tabular-nums"
                    style={{
                      color: isOnline ? 'var(--text-1)' : 'var(--text-5)',
                      textShadow: isOnline ? '0 0 20px rgba(16,185,129,0.3)' : 'none',
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
              {isOnline ? 'وقت التشغيل الحالي' : 'المولد متوقف'}
            </p>
          </motion.div>

          {/* ── Live Generator Status ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {isOnline
                  ? <Wifi className="w-4 h-4 text-emerald-400" />
                  : <WifiOff className="w-4 h-4" style={{ color: 'var(--text-5)' }} />}
                <span className="text-xs font-medium" style={{ color: 'var(--text-4)' }}>
                  حالة المولد — ThingSpeak
                </span>
              </div>
              <button
                onClick={() => setVoltageRefreshTick((n) => n + 1)}
                className="p-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-5)' }}
                title="تحديث"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${voltageLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex items-stretch justify-center gap-5 py-1">
              {/* Voltage */}
              <div className="text-center flex-1">
                <div
                  className="text-5xl sm:text-6xl font-mono font-bold tabular-nums"
                  dir="ltr"
                  style={{
                    color: isOnline ? '#10b981' : 'var(--text-5)',
                    textShadow: isOnline ? '0 0 24px rgba(16,185,129,0.35)' : 'none',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {voltageLoading ? '...' : voltage !== null ? Math.round(voltage) : '---'}
                </div>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-5)' }}>فولت (V)</p>
              </div>

              <div className="w-px self-stretch" style={{ background: 'var(--border-subtle)' }} />

              {/* Status orb */}
              <div className="text-center flex-1 flex flex-col items-center justify-center gap-2">
                <div className="relative inline-flex">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{
                      background: isOnline
                        ? 'radial-gradient(circle, rgba(16,185,129,0.25), rgba(16,185,129,0.05))'
                        : 'rgba(107,114,128,0.1)',
                      border: `2px solid ${isOnline ? 'rgba(16,185,129,0.5)' : 'rgba(107,114,128,0.3)'}`,
                      boxShadow: isOnline ? '0 0 20px rgba(16,185,129,0.2)' : 'none',
                    }}
                  >
                    {isOnline
                      ? <Wifi className="w-6 h-6 text-emerald-400" />
                      : <WifiOff className="w-6 h-6" style={{ color: 'var(--text-5)' }} />}
                  </div>
                  {isOnline && (
                    <span
                      className="absolute inset-0 rounded-full animate-ping"
                      style={{ background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.25)' }}
                    />
                  )}
                </div>
                <p className="text-sm font-bold" style={{ color: isOnline ? '#10b981' : '#6b7280' }}>
                  {voltageLoading ? '...' : isOnline ? 'نشط' : 'متوقف'}
                </p>
                {lastVoltageTime && (
                  <p className="text-[10px]" style={{ color: 'var(--text-5)' }}>{lastVoltageTime}</p>
                )}
              </div>
            </div>

            {thingspeakChannel && (
              <p className="text-center text-[10px] mt-3" style={{ color: 'var(--text-5)' }}>
                CH-{thingspeakChannel} · تحديث تلقائي كل 30 ثانية
              </p>
            )}
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
                  <p className="text-[10px]" style={{ color: 'var(--text-5)' }}>التسعيرة: 38 دينار/أمبير/ساعة</p>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-4xl font-bold tabular-nums font-mono"
                  dir="ltr"
                  style={{
                    color: isOnline ? '#fbbf24' : 'var(--text-5)',
                    textShadow: isOnline ? '0 0 15px rgba(251,191,36,0.3)' : 'none',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatCurrency(liveCost)}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-4)' }}>
                  دينار عراقي
                </span>
              </div>
              {isOnline && (
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
                pct={isOnline ? estimatedLoad / 100 : 0}
                color={estimatedLoad > 85 ? '#ef4444' : estimatedLoad > 60 ? '#3b82f6' : '#10b981'}
                label="حمل المحرك"
                value={isOnline ? `${Math.round(estimatedLoad)}%` : '—'}
              />
              {isOnline && (
                <div className="text-center">
                  <p className="text-[10px]" style={{ color: 'var(--text-5)' }}>
                    {Math.round(estimatedLoad * genPower / 100)} / {genPower} KW
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
                    {Math.round(fuelRemaining).toLocaleString('en-US')} لتر
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
                  <span>الحصة: {fuelQuotaTotal.toLocaleString('en-US')} لتر</span>
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
                <Activity className="w-4 h-4" style={{ color: isOnline ? '#10b981' : 'var(--text-5)' }} />
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
                    value: isRunning ? `${((estimatedLoad / 100) * genPower * elapsedSeconds / 3600).toFixed(1)}` : '0',
                    unit: 'KWh',
                    color: '#3b82f6',
                  },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <p
                      className="text-lg font-bold tabular-nums font-mono"
                      dir="ltr"
                      style={{ color: isOnline ? item.color : 'var(--text-5)', fontVariantNumeric: 'tabular-nums' }}
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
      </div>}
    </div>
  );
}
