'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Loader2, Copy, Check, Zap, Cpu } from 'lucide-react';

type TabKey = 'general' | 'notifications' | 'display' | 'connection' | 'thingsboard' | 'data';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'general',       label: 'عام'         },
  { key: 'notifications', label: 'إشعارات'     },
  { key: 'display',       label: 'واجهة'       },
  { key: 'connection',    label: 'الاتصال'     },
  { key: 'thingsboard',   label: 'ThingsBoard' },
  { key: 'data',          label: 'البيانات'    },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{label}</label>
      {children}
      {hint && <p className="text-[10px] text-gray-700" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{hint}</p>}
    </div>
  );
}

function TextInput({ defaultValue, placeholder }: { defaultValue?: string; placeholder?: string }) {
  return (
    <input
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-all"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        fontFamily: 'var(--font-ibm-arabic)',
      }}
      onFocus={(e) => (e.target.style.borderColor = 'rgba(16,185,129,0.4)')}
      onBlur={(e)  => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')}
    />
  );
}

function Toggle({ defaultChecked = false, label }: { defaultChecked?: boolean; label: string }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <span className="text-sm text-gray-300" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{label}</span>
      <button
        onClick={() => setOn((v) => !v)}
        className="relative w-10 h-5 rounded-full transition-all flex-shrink-0"
        style={{ background: on ? '#10b981' : 'rgba(255,255,255,0.1)' }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow"
          style={{ right: on ? '2px' : 'auto', left: on ? 'auto' : '2px' }}
        />
      </button>
    </div>
  );
}

function GeneralTab() {
  return (
    <div className="space-y-4">
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>معلومات المنشأة</h3>
        <Field label="اسم المنشأة"><TextInput defaultValue="مديرية كهرباء الأنبار — الرمادي" /></Field>
        <Field label="المنطقة الجغرافية"><TextInput defaultValue="الرمادي، محافظة الأنبار، العراق" /></Field>
        <Field label="البريد الإلكتروني للتواصل"><TextInput defaultValue="grid-ops@anbar-power.gov.iq" /></Field>
        <Field label="رقم الطوارئ"><TextInput defaultValue="+964 (0)91 234 5678" /></Field>
      </div>
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>إعدادات النظام</h3>
        <Field label="فترة التحديث التلقائي (ثانية)" hint="الحد الأدنى: 5 ثوان">
          <TextInput defaultValue="5" />
        </Field>
        <Field label="عدد المولدات الكلي">
          <TextInput defaultValue="3000" />
        </Field>
        <Field label="المنطقة الزمنية">
          <TextInput defaultValue="Asia/Baghdad (UTC+3)" />
        </Field>
      </div>
    </div>
  );
}

function NotificationsTab() {
  return (
    <div className="glass-card p-5 space-y-1">
      <h3 className="text-sm font-semibold text-white mb-3" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>تفضيلات الإشعارات</h3>
      <Toggle defaultChecked label="الأعطال الحرجة (حالة فورية)" />
      <Toggle defaultChecked label="تحذيرات إفراط الحرارة" />
      <Toggle defaultChecked label="انخفاض مستوى الوقود" />
      <Toggle label="الصيانة الدورية المجدولة" />
      <Toggle defaultChecked label="انقطاع الاتصال بالمولدات" />
      <Toggle label="تقارير الأداء اليومية" />
      <Toggle defaultChecked label="تنبيهات الأمان والوصول" />
      <Toggle label="رسائل البريد الإلكتروني" />
    </div>
  );
}

function DisplayTab() {
  return (
    <div className="glass-card p-5 space-y-1">
      <h3 className="text-sm font-semibold text-white mb-3" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>إعدادات الواجهة</h3>
      <Toggle defaultChecked label="الوضع الداكن (Dark Mode)" />
      <Toggle defaultChecked label="الرسوم المتحركة" />
      <Toggle label="الخريطة بشاشة كاملة افتراضياً" />
      <Toggle defaultChecked label="تحديث البيانات تلقائياً" />
      <Toggle defaultChecked label="الاتجاه من اليمين لليسار (RTL)" />
      <Toggle label="وضع إمكانية الوصول العالي التباين" />
    </div>
  );
}

function ConnectionTab() {
  const [testing, setTesting]     = useState(false);
  const [dbStatus, setDbStatus]   = useState<'idle' | 'ok' | 'error'>('idle');
  const [dbMsg, setDbMsg]         = useState('');

  const testConnection = async () => {
    setTesting(true);
    setDbStatus('idle');
    try {
      const { error } = await supabase.from('generators').select('id').limit(1);
      if (error) throw error;
      setDbStatus('ok');
      setDbMsg('اتصال ناجح بقاعدة البيانات');
    } catch (e: unknown) {
      setDbStatus('error');
      setDbMsg(e instanceof Error ? e.message : 'فشل الاتصال');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Supabase */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>إعدادات Supabase</h3>
          <button
            onClick={testConnection}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.25)',
              color: '#10b981',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            {testing
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : dbStatus === 'ok'
                ? <CheckCircle className="w-3 h-3" />
                : dbStatus === 'error'
                  ? <XCircle className="w-3 h-3 text-red-400" />
                  : <Zap className="w-3 h-3" />}
            {testing ? 'جارٍ الاختبار…' : 'اختبار الاتصال'}
          </button>
        </div>

        {dbStatus !== 'idle' && (
          <p className={`text-xs ${dbStatus === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}
             style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            {dbStatus === 'ok' ? '✓' : '✗'} {dbMsg}
          </p>
        )}

        <Field label="Project URL">
          <TextInput defaultValue={process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://your-project.supabase.co'} />
        </Field>
        <Field label="Anon Key" hint="المفتاح العام — آمن للنشر">
          <TextInput defaultValue="eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp…" />
        </Field>
        <Field label="Realtime Channel">
          <TextInput defaultValue="spgms-live-grid" />
        </Field>
      </div>

      {/* Live Status */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>حالة الخدمات</h3>
        {([
          { name: 'Supabase Database',    color: '#10b981', dot: 'bg-emerald-400' },
          { name: 'Supabase Realtime',    color: '#10b981', dot: 'bg-emerald-400' },
          { name: 'Edge Functions',       color: '#10b981', dot: 'bg-emerald-400' },
          { name: 'ThingsBoard MQTT',     color: '#f59e0b', dot: 'bg-amber-400'   },
        ] as const).map((s) => (
          <div key={s.name} className="flex items-center justify-between py-2 border-b last:border-0"
               style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <span className="text-sm text-gray-300" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{s.name}</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${s.dot} animate-pulse`} />
              <span className="text-xs" style={{ color: s.color }}>متصل</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Copy button helper ───────────────────────────────────────────────────────
function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={value}
          className="flex-1 rounded-xl px-3 py-2.5 text-sm text-gray-300 outline-none cursor-default"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            fontFamily: 'monospace',
          }}
        />
        <button
          onClick={copy}
          className="flex-shrink-0 p-2.5 rounded-xl transition-all"
          style={{
            background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
            color: copied ? '#10b981' : '#6b7280',
          }}
          title="نسخ"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </Field>
  );
}

function ThingsBoardTab() {
  const [testing, setTesting]   = useState(false);
  const [tbStatus, setTbStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [tbMsg, setTbMsg]       = useState('');

  // In a real setup this would come from env / DB
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin.replace(/:\d+$/, '')}/functions/v1/thingsboard-webhook`
    : 'https://your-project.supabase.co/functions/v1/thingsboard-webhook';

  const testTbConnection = async () => {
    setTesting(true);
    setTbStatus('idle');
    try {
      // Lightweight check: see if generators_live_status table is accessible
      const { error } = await supabase.from('generators_live_status').select('generator_code').limit(1);
      if (error) throw error;
      setTbStatus('ok');
      setTbMsg('جدول generators_live_status جاهز لاستقبال البيانات');
    } catch (e: unknown) {
      setTbStatus('error');
      setTbMsg(e instanceof Error ? e.message : 'فشل الاتصال بجدول الحالة الحية');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* Status banner */}
      <div className="glass-card p-4 flex items-center gap-3"
           style={{ border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)' }}>
        <Cpu className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-300" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            تكامل ThingsBoard مُفعَّل
          </p>
          <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            Edge Function جاهزة لاستقبال بيانات التلغراف من Rule Engine
          </p>
        </div>
      </div>

      {/* Webhook endpoint */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>Webhook Endpoint</h3>
          <button
            onClick={testTbConnection}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.25)',
              color: '#10b981',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            {testing
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : tbStatus === 'ok'
                ? <CheckCircle className="w-3 h-3" />
                : tbStatus === 'error'
                  ? <XCircle className="w-3 h-3 text-red-400" />
                  : <Zap className="w-3 h-3" />}
            {testing ? 'جارٍ الاختبار…' : 'اختبار الجدول'}
          </button>
        </div>

        {tbStatus !== 'idle' && (
          <p className={`text-xs ${tbStatus === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}
             style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            {tbStatus === 'ok' ? '✓' : '✗'} {tbMsg}
          </p>
        )}

        <CopyField
          label="Webhook URL — انسخها في إعدادات ThingsBoard Rule Engine"
          value={webhookUrl}
          hint="HTTP POST · Header مطلوب: x-webhook-secret"
        />

        <div className="rounded-xl p-3 space-y-1.5"
             style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[11px] font-mono text-amber-400">// Expected payload (JSON)</p>
          <pre className="text-[11px] font-mono text-gray-400 leading-5">{`{
  "generator_code": "GEN-RM-0042",
  "status": "online" | "offline" | "fault",
  "current_load": 450.5,   // kW
  "voltage": 380.0         // Volts
}`}</pre>
        </div>
      </div>

      {/* Server settings */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>إعدادات خادم ThingsBoard</h3>
        <Field label="Server URL">
          <TextInput defaultValue="http://thingsboard.anbar-grid.local:8080" />
        </Field>
        <Field label="مفتاح المستخدم (Tenant API Token)" hint="من: Account → Profile → JWT Token">
          <TextInput defaultValue="Bearer eyJhbGci…" />
        </Field>
        <Field label="Device Profile Filter" hint="اترك فارغاً لاستيراد كل الأجهزة">
          <TextInput defaultValue="SPGMS_Generator" />
        </Field>
      </div>

      {/* Secret */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>إعداد الأمان</h3>
        <Field
          label="WEBHOOK_SECRET"
          hint="يجب تطابقها مع قيمة المتغير البيئي في Supabase → Edge Functions → Secrets"
        >
          <TextInput defaultValue="••••••••••••••••••••••••••••••••" />
        </Field>

        <div className="rounded-xl p-3 space-y-1"
             style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <p className="text-xs font-semibold text-amber-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>⚠ تعليمات الربط في ThingsBoard</p>
          <ol className="text-[11px] text-gray-400 list-decimal list-inside space-y-0.5 leading-5"
              style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            <li>افتح Rule Engine → Rule Chains → Root Rule Chain</li>
            <li>أضف Node من نوع REST API Call</li>
            <li>الصق Webhook URL في حقل Endpoint URL</li>
            <li>أضف Header: <code className="font-mono text-amber-300">x-webhook-secret</code> بقيمة السر أعلاه</li>
            <li>اربط Node بـ Post telemetry</li>
          </ol>
        </div>
      </div>

      {/* MQTT */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>MQTT Broker</h3>
        <Field label="Broker Host"><TextInput defaultValue="mqtt.anbar-grid.local" /></Field>
        <Field label="Port"><TextInput defaultValue="1883" /></Field>
        <Field label="Topic Prefix"><TextInput defaultValue="spgms/ramadi/+/telemetry" /></Field>
        <Toggle defaultChecked label="TLS / SSL مُشفَّر" />
        <Toggle label="Bridge Mode (مرحّل)" />
      </div>
    </div>
  );
}

function DataTab() {
  const [deleting, setDeleting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const handleDeleteMock = async () => {
    if (!confirm('هل أنت متأكد من حذف جميع البيانات الوهمية؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    setDeleting(true);
    setDeleteResult(null);
    try {
      const tables = ['notifications', 'faults', 'operators', 'owned_generators', 'owners', 'generators'] as const;
      let total = 0;
      for (const t of tables) {
        const { data } = await supabase.from(t).delete().eq('is_mock', true).select();
        total += data?.length ?? 0;
      }
      setDeleteResult(`✓ تم حذف ${total} سجل وهمي بنجاح`);
    } catch (err: unknown) {
      setDeleteResult(`✗ فشل الحذف: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleReseed = async () => {
    if (!confirm('سيتم إعادة إدخال جميع البيانات الوهمية. هل تريد المتابعة؟')) return;
    setSeeding(true);
    setSeedResult(null);
    try {
      setSeedResult('⚠ إعادة الإدخال متاحة فقط من خلال سكربت السيرفر');
    } catch (err: unknown) {
      setSeedResult(`✗ فشل الإدخال: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>إدارة البيانات الوهمية</h3>
        <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
          البيانات الوهمية تشمل: 300 مولد، 6 أصحاب مولدات، 12 مولد مملوك، 26 مشغّل، 7 أعطال، و 10 إشعارات.
          يمكنك حذفها عند الانتقال إلى البيانات الحقيقية، أو إعادة إدخالها للاختبار.
        </p>

        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={handleDeleteMock}
            disabled={deleting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            {deleting ? (
              <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
            {deleting ? 'جارٍ الحذف...' : 'حذف جميع البيانات الوهمية'}
          </button>

          <button
            onClick={handleReseed}
            disabled={seeding}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.25)',
              color: '#3b82f6',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            {seeding ? (
              <span className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {seeding ? 'جارٍ الإدخال...' : 'إعادة إدخال البيانات الوهمية'}
          </button>
        </div>

        {deleteResult && (
          <p className={`text-xs mt-2 ${deleteResult.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}
             style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            {deleteResult}
          </p>
        )}
        {seedResult && (
          <p className={`text-xs mt-2 ${seedResult.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}
             style={{ fontFamily: 'var(--font-ibm-arabic)' }}>
            {seedResult}
          </p>
        )}
      </div>

      <div className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>معلومات قاعدة البيانات</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'المولدات', table: 'generators', count: 300 },
            { label: 'الأصحاب', table: 'owners', count: 6 },
            { label: 'المولدات المملوكة', table: 'owned_generators', count: 12 },
            { label: 'المشغّلون', table: 'operators', count: 26 },
            { label: 'الأعطال', table: 'faults', count: 7 },
            { label: 'الإشعارات', table: 'notifications', count: 10 },
          ].map((item) => (
            <div key={item.table} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{item.label}</span>
              <span className="text-xs font-bold text-emerald-400">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TAB_CONTENT: Record<TabKey, React.ReactNode> = {
  general:       <GeneralTab />,
  notifications: <NotificationsTab />,
  display:       <DisplayTab />,
  connection:    <ConnectionTab />,
  thingsboard:   <ThingsBoardTab />,
  data:          <DataTab />,
};

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>('general');
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>الإعدادات</h1>
          <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>تخصيص وإعداد نظام S.P.G.M.S</p>
        </div>
        <button
          onClick={save}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: saved ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.15)',
            border: `1px solid ${saved ? 'rgba(16,185,129,0.5)' : 'rgba(16,185,129,0.25)'}`,
            color: '#10b981',
            fontFamily: 'var(--font-ibm-arabic)',
          }}
        >
          {saved ? '✓ تم الحفظ' : 'حفظ التغييرات'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 glass-card p-1 w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-3 py-1.5 rounded-lg text-sm transition-all"
            style={{
              background: tab === key ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: tab === key ? 'white' : '#6b7280',
              fontFamily: 'var(--font-ibm-arabic)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {TAB_CONTENT[tab]}
    </div>
  );
}
