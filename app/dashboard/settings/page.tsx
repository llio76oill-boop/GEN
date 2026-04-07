'use client';

import { useState } from 'react';

type TabKey = 'general' | 'notifications' | 'display' | 'connection' | 'data';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'general',       label: 'عام'      },
  { key: 'notifications', label: 'إشعارات'  },
  { key: 'display',       label: 'واجهة'    },
  { key: 'connection',    label: 'الاتصال'  },
  { key: 'data',          label: 'البيانات' },
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
  return (
    <div className="space-y-4">
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>إعدادات Supabase</h3>
        <Field label="Project URL">
          <TextInput defaultValue="https://your-project.supabase.co" />
        </Field>
        <Field label="Anon Key" hint="المفتاح العام — آمن للنشر">
          <TextInput defaultValue="eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp…" />
        </Field>
        <Field label="Realtime Channel">
          <TextInput defaultValue="spgms-live-grid" />
        </Field>
      </div>
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>MQTT Broker</h3>
        <Field label="Broker Host"><TextInput defaultValue="mqtt.anbar-grid.local" /></Field>
        <Field label="Port"><TextInput defaultValue="1883" /></Field>
        <Field label="Topic Prefix"><TextInput defaultValue="spgms/ramadi/+/telemetry" /></Field>
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
      const res = await fetch('/api/mock-data', { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const total = Object.values(json.deleted as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
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
      const res = await fetch('/api/mock-data/seed', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSeedResult('✓ تم إعادة إدخال البيانات الوهمية بنجاح');
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
