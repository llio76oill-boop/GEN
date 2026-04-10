'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import LiveTelemetryBadge from '@/components/dashboard/LiveTelemetryBadge';
import {
  Cpu, Wifi, WifiOff, Zap, AlertTriangle, CheckCircle2,
  RefreshCw, ArrowUpRight, Info, ServerCrash, Radio,
  Activity, BarChart3, Clock, Layers, Settings2,
  Eye, EyeOff, Save, RotateCcw, Copy, Check, FlaskConical,
  Shield, Globe, SlidersHorizontal, BellRing, Gauge, ExternalLink,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────
interface LiveRow {
  id: number;
  generator_code: string;
  status: 'online' | 'offline' | 'fault';
  current_load: number;
  voltage: number;
  last_seen: string;
}

// ThingSpeak-sourced generator (bridges ThingSpeak → ThingsBoard view)
interface TsGen {
  id:        number;
  code:      string;
  area:      string;
  channel:   string;
  readKey:   string | null;
  fieldsMap: Record<string, string> | null;
  voltage:   number | null;
  status:    'online' | 'offline' | 'fault';
  lastSeen:  string | null;
  loading:   boolean;
}

type HealthStatus = 'checking' | 'ok' | 'degraded' | 'error';

// ─── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60)  return `${sec}ث`;
  if (sec < 3600) return `${Math.floor(sec / 60)}د`;
  return `${Math.floor(sec / 3600)}س`;
}

function statusColor(s: LiveRow['status']) {
  return s === 'online' ? '#10b981' : s === 'fault' ? '#f59e0b' : '#6b7280';
}
function statusLabel(s: LiveRow['status']) {
  return s === 'online' ? 'متصل' : s === 'fault' ? 'عطل' : 'منقطع';
}
function voltageToStatus(v: number): TsGen['status'] {
  if (v === 0) return 'offline';           // 0V = no signal = offline
  if (v < 170 || v > 270) return 'fault';  // out of safe range = fault
  return 'online';
}

// ─── Animated number ────────────────────────────────────────────────────────
function AnimNum({ value, unit = '' }: { value: number; unit?: string }) {
  return <>{value.toLocaleString('en-US')}{unit}</>;
}

// ─── Pulse ring around icon ─────────────────────────────────────────────────
function PulseRing({ color }: { color: string }) {
  return (
    <span
      className="absolute inset-0 rounded-full animate-ping opacity-30"
      style={{ background: color }}
    />
  );
}

// ─── KPI card ───────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon, label, value, unit, color, sub, pulse,
}: {
  icon: React.ElementType; label: string; value: number; unit?: string;
  color: string; sub?: string; pulse?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 flex flex-col gap-3 relative overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div className="relative w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
             style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
          {pulse && <PulseRing color={color} />}
          <Icon className="w-5 h-5 relative" style={{ color }} />
        </div>
        {sub && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
            {sub}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
          <AnimNum value={value} unit={unit} />
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
          {label}
        </p>
      </div>
      {/* bg glow */}
      <div className="pointer-events-none absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20"
           style={{ background: color }} />
    </motion.div>
  );
}

// ─── Health badge ────────────────────────────────────────────────────────────
function HealthBadge({ status }: { status: HealthStatus }) {
  const map: Record<HealthStatus, { label: string; color: string; dot: string }> = {
    checking: { label: 'جارٍ الفحص…',   color: '#6b7280', dot: 'animate-spin' },
    ok:       { label: 'يعمل بكفاءة',   color: '#10b981', dot: 'animate-pulse' },
    degraded: { label: 'أداء منخفض',    color: '#f59e0b', dot: 'animate-pulse' },
    error:    { label: 'لا يمكن الوصول', color: '#ef4444', dot: '' },
  };
  const m = map[status];
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium"
          style={{ color: m.color, fontFamily: 'var(--font-ibm-arabic)' }}>
      <span className={`w-2 h-2 rounded-full ${m.dot}`} style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

// ─── Mini SVG sparkline ──────────────────────────────────────────────────────
function Spark({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const r = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 40 - ((v - min) / r) * 36,
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  return (
    <svg viewBox="0 0 100 44" className="w-full h-10" preserveAspectRatio="none">
      <motion.path d={line} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeOut' }} />
    </svg>
  );
}

// ─── Settings persistence key ────────────────────────────────────────────────
const STORAGE_KEY = 'spgms_tb_settings';

interface TBSettings {
  serverUrl:       string;
  tenantToken:     string;
  deviceProfile:   string;
  webhookSecret:   string;
  mqttHost:        string;
  mqttPort:        string;
  mqttTopic:       string;
  mqttTls:         boolean;
  mqttBridge:      boolean;
  refreshInterval: string;
  alertOnFault:    boolean;
  alertOnOffline:  boolean;
  alertOnVoltage:  boolean;
  voltageMin:      string;
  voltageMax:      string;
  loadMax:         string;
}

const DEFAULT_SETTINGS: TBSettings = {
  serverUrl:       'http://thingsboard.anbar-grid.local:8080',
  tenantToken:     '',
  deviceProfile:   'SPGMS_Generator',
  webhookSecret:   '',
  mqttHost:        'mqtt.anbar-grid.local',
  mqttPort:        '1883',
  mqttTopic:       'spgms/ramadi/+/telemetry',
  mqttTls:         false,
  mqttBridge:      false,
  refreshInterval: '8',
  alertOnFault:    true,
  alertOnOffline:  true,
  alertOnVoltage:  true,
  voltageMin:      '340',
  voltageMax:      '420',
  loadMax:         '900',
};

function loadSettings(): TBSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

// ─── Reusable UI primitives for settings ────────────────────────────────────
function SField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>{label}</label>
      {children}
      {hint && <p className="text-[10px]" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>{hint}</p>}
    </div>
  );
}

function SInput({
  value, onChange, placeholder, type = 'text',
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="rounded-xl px-3 py-2.5 text-sm outline-none transition-all w-full"
      style={{
        background:   'rgba(255,255,255,0.04)',
        border:       '1px solid rgba(255,255,255,0.08)',
        color:        'var(--text-2)',
        fontFamily:   'var(--font-geist-mono), monospace',
      }}
      onFocus={(e)  => (e.target.style.borderColor = 'rgba(16,185,129,0.45)')}
      onBlur={(e)   => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
    />
  );
}

function SSecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '••••••••••••••••'}
        className="rounded-xl px-3 py-2.5 text-sm outline-none transition-all w-full pl-10"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border:     '1px solid rgba(255,255,255,0.08)',
          color:      'var(--text-2)',
          fontFamily: 'var(--font-geist-mono), monospace',
        }}
        onFocus={(e)  => (e.target.style.borderColor = 'rgba(16,185,129,0.45)')}
        onBlur={(e)   => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
        style={{ color: show ? '#10b981' : 'var(--text-5)' }}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function SCopyInput({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input
        readOnly value={value}
        className="flex-1 rounded-xl px-3 py-2.5 text-xs outline-none cursor-default"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border:     '1px solid rgba(255,255,255,0.06)',
          color:      'var(--text-5)',
          fontFamily: 'var(--font-geist-mono), monospace',
        }}
      />
      <button
        onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
        className="flex-shrink-0 p-2.5 rounded-xl transition-all"
        style={{
          background:   copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
          border:       `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
          color:        copied ? '#10b981' : 'var(--text-5)',
        }}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function SToggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <div
      className="flex items-center justify-between py-3 border-b last:border-0 cursor-pointer group"
      style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      onClick={() => onChange(!checked)}
    >
      <div>
        <p className="text-sm group-hover:text-white transition-colors"
           style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>{label}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>{sub}</p>}
      </div>
      <div
        className="relative w-11 h-6 rounded-full flex-shrink-0 transition-all"
        style={{ background: checked ? 'rgba(16,185,129,0.8)' : 'rgba(255,255,255,0.1)' }}
      >
        <span
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
          style={{ right: checked ? '4px' : 'auto', left: checked ? 'auto' : '4px' }}
        />
      </div>
    </div>
  );
}

function SSection({ title, icon: Icon, color, children }: {
  title: string; icon: React.ElementType; color: string; children: React.ReactNode;
}) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-3.5 flex items-center gap-3 border-b"
           style={{ borderColor: 'rgba(255,255,255,0.05)', background: `${color}08` }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ background: `${color}20`, border: `1px solid ${color}35` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color, fontFamily: 'var(--font-ibm-arabic)' }}>{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ─── Settings Tab Component ──────────────────────────────────────────────────
function SettingsTab() {
  const [cfg, setCfg]             = useState<TBSettings>(loadSettings);
  const [saved, setSaved]         = useState(false);
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [dirty, setDirty]         = useState(false);

  const set = <K extends keyof TBSettings>(key: K, val: TBSettings[K]) => {
    setCfg((prev) => ({ ...prev, [key]: val }));
    setDirty(true);
    setTestResult(null);
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const reset = () => {
    if (!confirm('هل تريد استعادة الإعدادات الافتراضية؟')) return;
    setCfg(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
    setDirty(false);
    setTestResult(null);
  };

  const testWebhook = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { error } = await supabase.from('generators_live_status').select('id').limit(1);
      if (error) throw error;
      setTestResult({ ok: true, msg: 'الاتصال بجدول generators_live_status ناجح ✓' });
    } catch (e: unknown) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : 'فشل الاتصال' });
    } finally {
      setTesting(false);
    }
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin.replace(/:\d+$/, '')}/functions/v1/thingsboard-webhook`
    : 'https://YOUR.supabase.co/functions/v1/thingsboard-webhook';

  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* Sticky save bar */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between gap-4 rounded-2xl px-5 py-3"
        style={{
          background:    'rgba(8,8,16,0.85)',
          backdropFilter:'blur(16px)',
          border:        dirty ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" style={{ color: '#10b981' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-ibm-arabic)' }}>
            إعدادات ThingsBoard
          </span>
          {dirty && (
            <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontFamily: 'var(--font-ibm-arabic)' }}>
              تعديلات غير محفوظة
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border:     '1px solid rgba(255,255,255,0.08)',
              color:      'var(--text-4)',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            استعادة الافتراضي
          </button>
          <button
            onClick={save}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: saved  ? 'rgba(16,185,129,0.25)' : dirty ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.06)',
              border:     `1px solid ${saved || dirty ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color:      saved || dirty ? '#10b981' : 'var(--text-5)',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            <Save className="w-3.5 h-3.5" />
            {saved ? 'تم الحفظ ✓' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>

      {/* ── 1. Server Connection ──────────────────────────────────── */}
      <SSection title="اتصال خادم ThingsBoard" icon={Globe} color="#6366f1">
        <SField label="عنوان الخادم (Server URL)" hint="مثال: http://tb.example.com:8080 أو https://thingsboard.cloud">
          <SInput value={cfg.serverUrl} onChange={(v) => set('serverUrl', v)} placeholder="http://thingsboard.anbar-grid.local:8080" />
        </SField>
        <SField label="Tenant API Token" hint="من: Account → Profile → JWT Token">
          <SSecretInput value={cfg.tenantToken} onChange={(v) => set('tenantToken', v)} placeholder="Bearer eyJhbGci…" />
        </SField>
        <SField label="Device Profile (اسم الـ Profile في TB)">
          <SInput value={cfg.deviceProfile} onChange={(v) => set('deviceProfile', v)} placeholder="SPGMS_Generator" />
        </SField>
      </SSection>

      {/* ── 2. Webhook / Edge Function ───────────────────────────── */}
      <SSection title="Webhook — Edge Function" icon={ArrowUpRight} color="#10b981">
        <SField label="رابط الـ Webhook (للنسخ في ThingsBoard Rule Engine)">
          <SCopyInput value={webhookUrl} />
        </SField>
        <SField label="WEBHOOK_SECRET" hint="يجب أن يطابق قيمة المتغير البيئي في Supabase → Edge Functions → Secrets">
          <SSecretInput value={cfg.webhookSecret} onChange={(v) => set('webhookSecret', v)} />
        </SField>

        {/* Test connection */}
        <div className="pt-1">
          <button
            onClick={testWebhook}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
            style={{
              background: 'rgba(16,185,129,0.1)',
              border:     '1px solid rgba(16,185,129,0.25)',
              color:      '#10b981',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            {testing
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <FlaskConical className="w-4 h-4" />}
            {testing ? 'جارٍ الاختبار…' : 'اختبار الاتصال بقاعدة البيانات'}
          </button>
          {testResult && (
            <motion.p
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-xs"
              style={{
                color:      testResult.ok ? '#10b981' : '#ef4444',
                fontFamily: 'var(--font-ibm-arabic)',
              }}
            >
              {testResult.ok ? <CheckCircle2 className="inline w-3.5 h-3.5 me-1" /> : <AlertTriangle className="inline w-3.5 h-3.5 me-1" />}
              {testResult.msg}
            </motion.p>
          )}
        </div>

        {/* Payload reference */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.12)' }}>
          <div className="px-4 py-2 text-[11px] font-mono" style={{ background: 'rgba(16,185,129,0.07)', color: '#34d399' }}>
            // Expected JSON payload from Rule Engine
          </div>
          <pre className="px-4 py-3 text-[11px] font-mono leading-5 overflow-x-auto"
               style={{ background: 'rgba(0,0,0,0.25)', color: '#9ca3af' }}>
{`{
  "generator_code": "GEN-RM-0042",
  "status":         "online" | "offline" | "fault",
  "current_load":   450.5,    // kW  (0 – 10,000)
  "voltage":        380.0     // V   (0 – 50,000)
}`}
          </pre>
        </div>
      </SSection>

      {/* ── 3. MQTT ──────────────────────────────────────────────── */}
      <SSection title="MQTT Broker" icon={Radio} color="#0ea5e9">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SField label="Broker Host">
            <SInput value={cfg.mqttHost} onChange={(v) => set('mqttHost', v)} placeholder="mqtt.anbar-grid.local" />
          </SField>
          <SField label="Port">
            <SInput value={cfg.mqttPort} onChange={(v) => set('mqttPort', v)} placeholder="1883" type="number" />
          </SField>
        </div>
        <SField label="Topic Pattern" hint="استخدم + كـ wildcard لاسم الجهاز">
          <SInput value={cfg.mqttTopic} onChange={(v) => set('mqttTopic', v)} placeholder="spgms/ramadi/+/telemetry" />
        </SField>
        <div className="pt-1">
          <SToggle
            checked={cfg.mqttTls}
            onChange={(v) => set('mqttTls', v)}
            label="تشفير TLS / SSL"
            sub="استخدم المنفذ 8883 عند تفعيل TLS"
          />
          <SToggle
            checked={cfg.mqttBridge}
            onChange={(v) => set('mqttBridge', v)}
            label="Bridge Mode"
            sub="لتجميع عدة Brokers في تدفق واحد"
          />
        </div>
      </SSection>

      {/* ── 4. Dashboard Behavior ─────────────────────────────────── */}
      <SSection title="سلوك لوحة التحكم" icon={SlidersHorizontal} color="#a855f7">
        <SField label="فترة التحديث التلقائي (ثانية)" hint="الحد الأدنى المُوصى: 5 ثوانٍ">
          <SInput value={cfg.refreshInterval} onChange={(v) => set('refreshInterval', v)} type="number" />
        </SField>
        <SField label="الحد الأقصى لحمل المولد (kW)" hint="القراءات فوق هذا الحد ستُظلَّل باللون الأحمر">
          <SInput value={cfg.loadMax} onChange={(v) => set('loadMax', v)} type="number" placeholder="900" />
        </SField>
      </SSection>

      {/* ── 5. Alerts & Thresholds ────────────────────────────────── */}
      <SSection title="حدود التنبيه والتحذير" icon={BellRing} color="#f59e0b">
        <div>
          <SToggle
            checked={cfg.alertOnFault}
            onChange={(v) => set('alertOnFault', v)}
            label="تنبيه عند حالة عطل (fault)"
            sub="إشعار فوري عند وصول حالة fault من ThingsBoard"
          />
          <SToggle
            checked={cfg.alertOnOffline}
            onChange={(v) => set('alertOnOffline', v)}
            label="تنبيه عند انقطاع الاتصال (offline)"
            sub="إشعار عند توقف إرسال البيانات من المولد"
          />
          <SToggle
            checked={cfg.alertOnVoltage}
            onChange={(v) => set('alertOnVoltage', v)}
            label="تنبيه عند تذبذب الفولتية"
            sub="يُفعَّل عند خروج الفولتية عن النطاق المُحدَّد أدناه"
          />
        </div>
        {cfg.alertOnVoltage && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-4 pt-1">
            <SField label="الحد الأدنى للفولتية (V)">
              <SInput value={cfg.voltageMin} onChange={(v) => set('voltageMin', v)} type="number" placeholder="340" />
            </SField>
            <SField label="الحد الأقصى للفولتية (V)">
              <SInput value={cfg.voltageMax} onChange={(v) => set('voltageMax', v)} type="number" placeholder="420" />
            </SField>
          </motion.div>
        )}
      </SSection>

      {/* ── 6. Security ───────────────────────────────────────────── */}
      <SSection title="الأمان والصلاحيات" icon={Shield} color="#ef4444">
        <div className="rounded-xl p-4 space-y-2"
             style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <p className="text-xs font-semibold" style={{ color: '#ef4444', fontFamily: 'var(--font-ibm-arabic)' }}>
            تحذيرات أمنية
          </p>
          <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
            {[
              'لا تُشارك WEBHOOK_SECRET — يمنح الوصول الكامل لكتابة بيانات التلغراف',
              'استخدم HTTPS وليس HTTP في بيئة الإنتاج',
              'يُخزَّن Tenant Token محلياً (localStorage) — لا يُرسَل إلى أي خادم',
              'بدّل كلمة المرور الافتراضية لـ ThingsBoard (sysadmin@thingsboard.org) فوراً',
            ].map((w) => (
              <li key={w} className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                {w}
              </li>
            ))}
          </ul>
        </div>
        <SToggle
          checked={false}
          onChange={() => {}}
          label="تسجيل طلبات الـ Webhook في Supabase Logs"
          sub="مفيد للتشخيص — يزيد من حجم السجلات"
        />
      </SSection>

      {/* Bottom save */}
      <div className="flex justify-end gap-3 pb-4">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border:     '1px solid rgba(255,255,255,0.08)',
            color:      'var(--text-4)',
            fontFamily: 'var(--font-ibm-arabic)',
          }}
        >
          <RotateCcw className="w-4 h-4" />
          استعادة الافتراضي
        </button>
        <button
          onClick={save}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(14,165,233,0.2))',
            border:     '1px solid rgba(16,185,129,0.35)',
            color:      '#10b981',
            fontFamily: 'var(--font-ibm-arabic)',
            boxShadow:  saved ? '0 0 20px rgba(16,185,129,0.15)' : 'none',
          }}
        >
          <Save className="w-4 h-4" />
          {saved ? 'تم الحفظ ✓' : 'حفظ جميع الإعدادات'}
        </button>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function ThingsBoardPage() {
  const [rows, setRows]             = useState<LiveRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [health, setHealth]         = useState<HealthStatus>('checking');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab]   = useState<'telemetry' | 'architecture' | 'guide' | 'settings'>('telemetry');

  // ── ThingSpeak bridge state ───────────────────────────────────────────────
  const [tsGens, setTsGens]         = useState<TsGen[]>([]);
  const [tsLoading, setTsLoading]   = useState(false);

  // mock load-history per generator (last 10 readings)
  const [sparkData] = useState<Record<string, number[]>>(() => ({}));

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('generators_live_status')
        .select('*')
        .order('last_seen', { ascending: false })
        .limit(50);
      if (error) { setHealth('error'); return; }
      setRows(data ?? []);
      // health is set after tsGens merge — updated below in render
      setHealth(data && data.length > 0 ? 'ok' : 'checking');
      setLastRefresh(new Date());
    } catch {
      setHealth('error');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch ThingSpeak generators from owned_generators table ──────────────
  const fetchTsGens = useCallback(async () => {
    setTsLoading(true);
    try {
      const { data: gens } = await supabase
        .from('owned_generators')
        .select('id, code, area, thingspeak_channel_id, thingspeak_read_key, thingspeak_fields_map')
        .not('thingspeak_channel_id', 'is', null)
        .neq('is_mock', true);

      if (!gens || gens.length === 0) { setTsLoading(false); return; }

      const results = await Promise.all(
        gens.map(async (g) => {
          try {
            const url = `https://api.thingspeak.com/channels/${g.thingspeak_channel_id}/fields/1.json?api_key=${g.thingspeak_read_key}&results=1`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const json = await res.json();
            const feed = json.feeds?.[0];
            const v = feed?.field1 ? parseFloat(feed.field1) : null;
            return {
              id:        g.id,
              code:      g.code,
              area:      g.area,
              channel:   g.thingspeak_channel_id,
              readKey:   g.thingspeak_read_key,
              fieldsMap: (g.thingspeak_fields_map as Record<string, string> | null) ?? null,
              voltage:   v,
              status:    v !== null ? voltageToStatus(v) : 'offline' as const,
              lastSeen:  feed?.created_at ?? null,
              loading:   false,
            } satisfies TsGen;
          } catch {
            return {
              id:        g.id,
              code:      g.code,
              area:      g.area,
              channel:   g.thingspeak_channel_id,
              readKey:   g.thingspeak_read_key,
              fieldsMap: (g.thingspeak_fields_map as Record<string, string> | null) ?? null,
              voltage:  null,
              status:   'offline' as const,
              lastSeen: null,
              loading:  false,
            } satisfies TsGen;
          }
        })
      );
      setTsGens(results);
    } catch { /* silent */ } finally {
      setTsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchRows, 8000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchRows]);

  // Fetch ThingSpeak generators on mount + every 15s
  useEffect(() => { fetchTsGens(); }, [fetchTsGens]);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchTsGens, 15_000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchTsGens]);

  // derived stats — merge TB rows + ThingSpeak generators
  const tsOnline  = tsGens.filter((g) => g.status === 'online').length;
  const tsFault   = tsGens.filter((g) => g.status === 'fault').length;
  const tsOffline = tsGens.filter((g) => g.status === 'offline').length;
  const tsVolts   = tsGens.map((g) => g.voltage).filter((v): v is number => v !== null && v > 0);

  const total   = rows.length + tsGens.length;
  const online  = rows.filter((r) => r.status === 'online').length  + tsOnline;
  const fault   = rows.filter((r) => r.status === 'fault').length   + tsFault;
  const offline = rows.filter((r) => r.status === 'offline').length + tsOffline;
  const avgLoad = rows.length ? Math.round(rows.reduce((s, r) => s + r.current_load, 0) / rows.length) : 0;

  const allVolts = [
    ...rows.map((r) => r.voltage),
    ...tsVolts,
  ];
  const avgVolt = allVolts.length ? Math.round(allVolts.reduce((s, v) => s + v, 0) / allVolts.length) : 0;

  // Sync health badge with combined data
  const derivedHealth: HealthStatus =
    health === 'error'    ? 'error' :
    total > 0             ? 'ok' :
    tsLoading || loading  ? 'checking' :
                            'degraded';

  const TABS = [
    { key: 'telemetry',    label: 'التلغراف الحي',     icon: Activity       },
    { key: 'architecture', label: 'معمارية التكامل',   icon: Layers         },
    { key: 'guide',        label: 'دليل الإعداد',      icon: Info           },
    { key: 'settings',     label: 'الإعدادات',          icon: Settings2      },
  ] as const;

  return (
    <div className="space-y-6 max-w-6xl" dir="rtl">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {/* TB Logo */}
          <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
               style={{ background: 'linear-gradient(135deg,#10b981,#0ea5e9)', boxShadow: '0 0 30px rgba(16,185,129,0.35)' }}>
            <span className="absolute inset-0 rounded-2xl animate-ping opacity-20"
                  style={{ background: 'linear-gradient(135deg,#10b981,#0ea5e9)' }} />
            <Cpu className="w-7 h-7 text-white relative" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>ThingsBoard</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                IoT Platform
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
              مركز بيانات إنترنت الأشياء — 3,000 مولد في الأنبار
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <HealthBadge status={derivedHealth} />
          <span className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
            آخر تحديث: {lastRefresh.toLocaleTimeString('ar-IQ')}
          </span>
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: autoRefresh ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${autoRefresh ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: autoRefresh ? '#10b981' : 'var(--text-4)',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            <Radio className={`w-3 h-3 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'مباشر' : 'متوقف'}
          </button>
          <button
            onClick={fetchRows}
            disabled={loading}
            className="p-2 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── KPI row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="lg:col-span-2">
          <KpiCard icon={Cpu}          label="أجهزة مُسجَّلة حياً"  value={total}   color="#6366f1" sub="TB Devices" pulse />
        </div>
        <KpiCard icon={CheckCircle2}   label="متصلة"                 value={online}  color="#10b981" sub="Online" />
        <KpiCard icon={AlertTriangle}  label="أعطال نشطة"            value={fault}   color="#f59e0b" sub="Fault"  pulse={fault > 0} />
        <KpiCard icon={WifiOff}        label="منقطعة"                 value={offline} color="#6b7280" sub="Offline" />
        <KpiCard icon={Zap}            label="متوسط الحمل (kW)"       value={avgLoad} color="#0ea5e9" sub="AvgLoad" />
      </div>

      {/* ── Secondary metrics strip ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Avg voltage */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }}>
            <BarChart3 className="w-5 h-5" style={{ color: '#a855f7' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs mb-1" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
              متوسط الفولتية
            </p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>
              <AnimNum value={avgVolt} unit=" V" />
            </p>
          </div>
          <div className="w-24 opacity-70">
            <Spark data={rows.slice(0, 10).map((r) => r.voltage)} color="#a855f7" />
          </div>
        </motion.div>

        {/* Webhook health */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative"
               style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <span className="absolute inset-0 rounded-xl animate-ping opacity-20 bg-emerald-500" />
            <Wifi className="w-5 h-5 relative" style={{ color: '#10b981' }} />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
              Edge Function Webhook
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-emerald-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                جاهز للاستقبال
              </span>
              <span className="text-[10px] font-mono text-gray-500">POST /v1/thingsboard-webhook</span>
            </div>
          </div>
        </motion.div>

        {/* Rule engine */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <ServerCrash className="w-5 h-5" style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
              Rule Engine
            </p>
            <p className="text-sm font-semibold" style={{ color: '#f59e0b', fontFamily: 'var(--font-ibm-arabic)' }}>
              في انتظار الربط
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 glass-card p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key as typeof activeTab)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
            style={{
              background: activeTab === key ? 'rgba(16,185,129,0.12)' : 'transparent',
              border: activeTab === key ? '1px solid rgba(16,185,129,0.25)' : '1px solid transparent',
              color: activeTab === key ? '#10b981' : 'var(--text-4)',
              fontFamily: 'var(--font-ibm-arabic)',
            }}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Telemetry ──────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'telemetry' && (
          <motion.div key="telemetry"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
            className="space-y-4">

            {/* ── ThingSpeak Bridge Section ──────────────────────────── */}
            {(tsGens.length > 0 || tsLoading) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card overflow-hidden"
                style={{ border: '1px solid rgba(168,85,247,0.2)' }}
              >
                <div className="px-5 py-3 flex items-center justify-between border-b"
                     style={{ borderColor: 'rgba(168,85,247,0.15)', background: 'rgba(168,85,247,0.06)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                         style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.3)' }}>
                      <Gauge className="w-4 h-4" style={{ color: '#a855f7' }} />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: '#a855f7', fontFamily: 'var(--font-ibm-arabic)' }}>
                      ThingSpeak — مولدات مُوَصَّلة
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)' }}>
                      {tsGens.length} قناة
                    </span>
                  </div>
                  <button onClick={fetchTsGens} disabled={tsLoading}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#a855f7' }}>
                    <RefreshCw className={`w-3.5 h-3.5 ${tsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {tsLoading && tsGens.length === 0 ? (
                  <div className="px-5 py-6 flex items-center gap-3 text-sm"
                       style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    <RefreshCw className="w-4 h-4 animate-spin" style={{ color: '#a855f7' }} />
                    جارٍ جلب بيانات ThingSpeak…
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    {tsGens.map((g) => {
                      const sc = g.status === 'online' ? '#10b981' : g.status === 'fault' ? '#f59e0b' : '#6b7280';
                      const sl = g.status === 'online' ? 'متصل' : g.status === 'fault' ? 'عطل' : 'منقطع';
                      return (
                        <div key={g.id} className="px-5 py-4 flex items-center gap-4 flex-wrap hover:bg-white/[0.015] transition-colors">
                          {/* Status dot */}
                          <span className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ background: sc, boxShadow: g.status === 'online' ? `0 0 6px ${sc}` : 'none' }} />
                          {/* Code + Area */}
                          <div className="min-w-[100px]">
                            <p className="text-xs font-bold font-mono" style={{ color: 'var(--text-2)' }}>{g.code}</p>
                            <p className="text-[10px]" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>{g.area}</p>
                          </div>
                          {/* Status badge */}
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: `${sc}15`, color: sc, border: `1px solid ${sc}30`, fontFamily: 'var(--font-ibm-arabic)' }}>
                            {sl}
                          </span>
                          {/* Live telemetry — independent per-row poll */}
                          <LiveTelemetryBadge
                            channelId={g.channel}
                            readApiKey={g.readKey}
                            fieldsMap={g.fieldsMap}
                            compact
                            pollMs={15_000}
                          />
                          {/* Channel link */}
                          <a href={`https://thingspeak.com/channels/${g.channel}`}
                             target="_blank" rel="noopener noreferrer"
                             className="text-[10px] font-mono flex items-center gap-1 hover:opacity-80 transition-opacity"
                             style={{ color: '#a855f7' }}>
                            <Radio className="w-3 h-3" />
                            CH {g.channel}
                          </a>
                          {/* Profile link */}
                          <Link
                            href={`/dashboard/generators/${g.code}`}
                            className="ms-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all flex-shrink-0"
                            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', fontFamily: 'var(--font-ibm-arabic)' }}
                          >
                            <ExternalLink className="w-3 h-3" />
                            عرض الملف
                          </Link>
                          {/* Last seen */}
                          {g.lastSeen && (
                            <span className="text-[10px] flex items-center gap-1 flex-shrink-0"
                                  style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                              <Clock className="w-3 h-3" />
                              {new Date(g.lastSeen).toLocaleTimeString('ar-IQ')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {rows.length === 0 && !loading && (
              <div className="glass-card p-12 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                     style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <Cpu className="w-8 h-8" style={{ color: '#6366f1' }} />
                </div>
                <div>
                  <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    لا توجد بيانات حية حتى الآن
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    ستظهر هنا قراءات التلغراف فور بدء إرسالها من ThingsBoard Rule Engine
                  </p>
                </div>
                <span className="text-xs font-mono px-3 py-1.5 rounded-full"
                      style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                  جدول: generators_live_status
                </span>
              </div>
            )}

            {rows.length > 0 && (
              <>
                {/* Status distribution bar */}
                <div className="glass-card p-5 space-y-3">
                  <p className="text-xs font-medium" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                    توزيع الحالات ({total} جهاز مُبلَّغ)
                  </p>
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                    {online  > 0 && <div className="rounded-full transition-all" style={{ flex: online,  background: '#10b981' }} />}
                    {fault   > 0 && <div className="rounded-full transition-all" style={{ flex: fault,   background: '#f59e0b' }} />}
                    {offline > 0 && <div className="rounded-full transition-all" style={{ flex: offline, background: '#374151' }} />}
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />متصل ({online})</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"   />عطل ({fault})</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600"    />منقطع ({offline})</span>
                  </div>
                </div>

                {/* Telemetry table */}
                <div className="glass-card overflow-hidden">
                  <div className="px-5 py-3 flex items-center justify-between border-b"
                       style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>
                      آخر قراءات التلغراف
                    </p>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-5)' }}>
                      {rows.length} سجل
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {['كود المولد', 'الحالة', 'الحمل (kW)', 'الفولتية (V)', 'آخر إرسال'].map((h) => (
                            <th key={h} className="px-5 py-3 text-right text-xs font-medium"
                                style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <motion.tr key={row.id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="group border-b last:border-0 hover:bg-white/[0.02] transition-colors"
                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                            <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--text-3)' }}>
                              {row.generator_code}
                            </td>
                            <td className="px-5 py-3">
                              <span className="flex items-center gap-1.5 text-xs font-medium"
                                    style={{ color: statusColor(row.status), fontFamily: 'var(--font-ibm-arabic)' }}>
                                <span className="w-1.5 h-1.5 rounded-full"
                                      style={{ background: statusColor(row.status) }} />
                                {statusLabel(row.status)}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full overflow-hidden bg-white/5">
                                  <div className="h-full rounded-full bg-blue-400 transition-all"
                                       style={{ width: `${Math.min((row.current_load / 500) * 100, 100)}%` }} />
                                </div>
                                <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>
                                  {row.current_load.toFixed(1)}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-xs font-mono" style={{ color: 'var(--text-3)' }}>
                              <span className={`${row.voltage < 340 || row.voltage > 420 ? 'text-amber-400' : ''}`}>
                                {row.voltage.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                                <Clock className="w-3 h-3" />
                                {timeAgo(row.last_seen)} مضت
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── Tab: Architecture ───────────────────────────────────── */}
        {activeTab === 'architecture' && (
          <motion.div key="arch"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
            className="space-y-4">

            {/* Flow diagram */}
            <div className="glass-card p-8">
              <p className="text-sm font-semibold mb-8 text-center"
                 style={{ color: 'var(--text-3)', fontFamily: 'var(--font-ibm-arabic)' }}>
                تدفق البيانات من المولدات إلى لوحة التحكم
              </p>
              <div className="flex flex-col lg:flex-row items-center justify-center gap-0">
                {[
                  { icon: Zap,         label: 'مولد كهربائي',        sub: 'MQTT Client',           color: '#10b981', bg: 'from-emerald-500/20 to-emerald-600/10' },
                  { icon: Radio,       label: 'ThingsBoard',          sub: 'MQTT Broker + Rule Engine', color: '#6366f1', bg: 'from-indigo-500/20 to-indigo-600/10' },
                  { icon: ArrowUpRight,label: 'Edge Function',        sub: 'Supabase Webhook',      color: '#0ea5e9', bg: 'from-sky-500/20 to-sky-600/10'     },
                  { icon: Cpu,         label: 'generators_live_status', sub: 'Supabase DB table',   color: '#a855f7', bg: 'from-purple-500/20 to-purple-600/10' },
                  { icon: BarChart3,   label: 'لوحة التحكم',          sub: 'S.P.G.M.S Dashboard',  color: '#f59e0b', bg: 'from-amber-500/20 to-amber-600/10'   },
                ].map((node, i, arr) => (
                  <div key={node.label} className="flex flex-col lg:flex-row items-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.12 }}
                      className={`flex flex-col items-center gap-3 bg-gradient-to-br ${node.bg} rounded-2xl p-5 w-36 border hover:scale-105 transition-transform`}
                      style={{ borderColor: `${node.color}30` }}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                           style={{ background: `${node.color}20`, border: `1px solid ${node.color}40` }}>
                        <node.icon className="w-6 h-6" style={{ color: node.color }} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-ibm-arabic)' }}>{node.label}</p>
                        <p className="text-[10px] mt-0.5 font-mono leading-snug" style={{ color: 'var(--text-5)' }}>{node.sub}</p>
                      </div>
                    </motion.div>
                    {i < arr.length - 1 && (
                      <motion.div
                        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                        transition={{ delay: i * 0.12 + 0.1, duration: 0.4 }}
                        className="w-8 lg:w-10 h-0.5 lg:h-auto lg:w-10 mx-1 my-1 lg:my-0"
                        style={{ background: `linear-gradient(90deg, ${node.color}60, ${arr[i+1].color}60)` }}
                      >
                        <div className="hidden lg:flex items-center justify-center text-gray-600 text-lg">→</div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Integration specs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[
                {
                  title: 'بروتوكول الاتصال',
                  color: '#6366f1',
                  rows: [
                    ['النوع', 'MQTT v3.1.1 / Webhook HTTP'],
                    ['المنفذ (MQTT)', '1883 (أو 8883 TLS)'],
                    ['Topic Pattern', 'v1/devices/me/telemetry'],
                    ['Webhook Method', 'POST + x-webhook-secret'],
                    ['Payload Format', 'JSON'],
                  ],
                },
                {
                  title: 'حقول البيانات المُرسَلة',
                  color: '#10b981',
                  rows: [
                    ['generator_code', 'string (معرّف المولد)'],
                    ['status', 'online | offline | fault'],
                    ['current_load', 'number (kW · 0–10,000)'],
                    ['voltage', 'number (V · 0–50,000)'],
                    ['last_seen', 'auto — يُضاف من Edge Fn'],
                  ],
                },
              ].map((card) => (
                <div key={card.title} className="glass-card overflow-hidden">
                  <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)', background: `${card.color}08` }}>
                    <p className="text-sm font-semibold" style={{ color: card.color, fontFamily: 'var(--font-ibm-arabic)' }}>{card.title}</p>
                  </div>
                  <table className="w-full text-xs">
                    <tbody>
                      {card.rows.map(([k, v]) => (
                        <tr key={k} className="border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                          <td className="px-5 py-2.5 font-mono" style={{ color: card.color }}>{k}</td>
                          <td className="px-5 py-2.5" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Tab: Setup Guide ────────────────────────────────────── */}
        {activeTab === 'guide' && (          <motion.div key="guide"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
            className="space-y-4">
            {[
              {
                step: '01',
                title: 'تشغيل جدول قاعدة البيانات',
                color: '#10b981',
                content: (
                  <div className="space-y-2">
                    <p className="text-sm" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                      شغّل ملف الـ Migration التالي في Supabase SQL Editor:
                    </p>
                    <pre className="rounded-xl p-4 text-xs font-mono leading-5 overflow-x-auto"
                         style={{ background: 'rgba(0,0,0,0.3)', color: '#86efac', border: '1px solid rgba(16,185,129,0.15)' }}>
{`supabase/migrations/20260409_generators_live_status.sql`}
                    </pre>
                  </div>
                ),
              },
              {
                step: '02',
                title: 'نشر Edge Function على Supabase',
                color: '#6366f1',
                content: (
                  <div className="space-y-2">
                    <div className="rounded-xl p-4 font-mono text-xs leading-6 overflow-x-auto"
                         style={{ background: 'rgba(0,0,0,0.3)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.15)' }}>
                      <p style={{ color: '#6b7280' }}># من جذر المشروع:</p>
                      <p>supabase functions deploy thingsboard-webhook</p>
                      <p style={{ color: '#6b7280' }}># ثم أضف السر:</p>
                      <p>supabase secrets set WEBHOOK_SECRET=&lt;قيمة-سرية&gt;</p>
                    </div>
                  </div>
                ),
              },
              {
                step: '03',
                title: 'إعداد ThingsBoard Rule Chain',
                color: '#f59e0b',
                content: (
                  <ol className="space-y-2 list-none" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
                    {[
                      'افتح ThingsBoard → Rule Engine → Rule Chains → Root Rule Chain',
                      'أضف Node جديد من نوع "REST API Call"',
                      'في حقل Endpoint URL: الصق رابط الـ Webhook أعلاه',
                      'أضف Header: x-webhook-secret = &lt;WEBHOOK_SECRET&gt;',
                      'في حقل Request Body: {"generator_code": "${deviceName}", "status": "${status}", "current_load": ${current_load}, "voltage": ${voltage}}',
                      'اربط الـ Node بـمخرج Post telemetry أو الـ Alarm الخاص بك',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full font-mono text-xs flex items-center justify-center mt-0.5"
                              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                          {i + 1}
                        </span>
                        <span style={{ color: 'var(--text-3)' }} dangerouslySetInnerHTML={{ __html: item }} />
                      </li>
                    ))}
                  </ol>
                ),
              },
              {
                step: '04',
                title: 'التحقق من الاتصال',
                color: '#0ea5e9',
                content: (
                  <div className="space-y-2">
                    <p className="text-sm" style={{ color: 'var(--text-4)', fontFamily: 'var(--font-ibm-arabic)' }}>
                      اختبر الـ Webhook مباشرة من Terminal:
                    </p>
                    <pre className="rounded-xl p-4 text-xs font-mono leading-5 overflow-x-auto"
                         style={{ background: 'rgba(0,0,0,0.3)', color: '#67e8f9', border: '1px solid rgba(14,165,233,0.15)' }}>
{`curl -X POST https://YOUR.supabase.co/functions/v1/thingsboard-webhook \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-secret: YOUR_SECRET" \\
  -d '{"generator_code":"GEN-RM-0001","status":"online","current_load":450,"voltage":380}'`}
                    </pre>
                    <p className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
                      الرد المتوقع: <code className="font-mono text-emerald-400">&#123;"ok":true,...&#125;</code> — ثم اضغط تحديث في تاب التلغراف الحي
                    </p>
                  </div>
                ),
              },
            ].map(({ step, title, color, content }) => (
              <motion.div key={step}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: parseInt(step) * 0.08 }}
                className="glass-card overflow-hidden">
                <div className="p-5 border-b flex items-center gap-4"
                     style={{ borderColor: 'rgba(255,255,255,0.05)', background: `${color}08` }}>
                  <span className="text-2xl font-black font-mono"
                        style={{ color: `${color}50`, lineHeight: 1 }}>{step}</span>
                  <h3 className="text-sm font-semibold" style={{ color, fontFamily: 'var(--font-ibm-arabic)' }}>
                    {title}
                  </h3>
                </div>
                <div className="p-5">{content}</div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Tab: Settings ───────────────────────────────────────── */}
        {activeTab === 'settings' && <SettingsTab />}

      </AnimatePresence>
    </div>
  );
}
