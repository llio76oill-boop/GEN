'use client';

import { useState } from 'react';
import { Key, Eye, EyeOff, Copy, Check, RefreshCw, Shield, Clock, User } from 'lucide-react';

interface ApiKey { id: string; label: string; value: string; created: string; lastUsed: string; }

const API_KEYS: ApiKey[] = [
  { id: 'system', label: 'مفتاح النظام الرئيسي', value: 'sk-spgms-prod-8f4a2c91d7e3b506af2a1d4c8e7f3b06',   created: '١ يناير ٢٠٢٦',   lastUsed: 'منذ دقيقتين' },
  { id: 'ws',     label: 'مفتاح Supabase Realtime', value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.spgms', created: '١٥ مارس ٢٠٢٦', lastUsed: 'منذ 5 ثوان' },
  { id: 'hook',   label: 'سر Webhook',               value: 'whsec_9a3f71c2e84d6b05a123e456f789abcd',          created: '١٠ أبريل ٢٠٢٦', lastUsed: 'منذ يومين' },
];

const SESSIONS = [
  { ip: '192.168.1.104', device: 'Chrome / Windows 11', location: 'الرمادي، الأنبار', since: 'منذ 18 دقيقة', current: true  },
  { ip: '10.0.0.55',     device: 'Firefox / Ubuntu',    location: 'الرمادي، الأنبار', since: 'منذ 3 ساعات',  current: false },
  { ip: '172.16.0.21',   device: 'Safari / macOS',      location: 'الرمادي، الأنبار', since: 'منذ يومين',    current: false },
];

const AUDIT = [
  { action: 'تسجيل دخول ناجح',     user: 'admin@spgms.iq',    time: 'منذ 18 د',  ok: true  },
  { action: 'تغيير كلمة المرور',    user: 'admin@spgms.iq',    time: 'منذ 2 س',   ok: true  },
  { action: 'تجديد مفتاح API',      user: 'sys@spgms.iq',      time: 'منذ 1 ي',   ok: true  },
  { action: 'محاولة تسجيل دخول فاشلة', user: 'unknown',        time: 'منذ 3 ي',   ok: false },
  { action: 'تصدير تقرير الأعطال',  user: 'analyst@spgms.iq',  time: 'منذ 5 ي',   ok: true  },
];

export default function SecurityPage() {
  const [revealed, setRevealed]   = useState<Record<string, boolean>>({});
  const [copied,   setCopied]     = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setRevealed((p) => ({ ...p, [id]: !p[id] }));

  const copy = (id: string, val: string) => {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopied((p) => ({ ...p, [id]: true }));
    setTimeout(() => setCopied((p) => ({ ...p, [id]: false })), 1800);
  };

  const mask = (val: string) => val.slice(0, 8) + '••••••••••••••••••••' + val.slice(-4);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>الأمان والصلاحيات</h1>
        <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>إدارة مفاتيح الوصول والجلسات النشطة</p>
      </div>

      {/* API Keys */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Key className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>مفاتيح API</h2>
        </div>
        {API_KEYS.map((k) => (
          <div key={k.id} className="rounded-xl p-3.5 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-200" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{k.label}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-600" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>آخر استخدام: {k.lastUsed}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 rounded-lg px-3 py-2 text-xs font-mono truncate"
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', color: '#9ca3af', direction: 'ltr' }}
              >
                {revealed[k.id] ? k.value : mask(k.value)}
              </code>
              <button onClick={() => toggle(k.id)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title={revealed[k.id] ? 'إخفاء' : 'إظهار'}>
                {revealed[k.id] ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
              </button>
              <button onClick={() => copy(k.id, k.value)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                {copied[k.id] ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gray-500" />}
              </button>
              <button className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="إعادة توليد">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="text-[10px] text-gray-700" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>أُنشئ: {k.created}</p>
          </div>
        ))}
      </div>

      {/* Active Sessions */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>الجلسات النشطة</h2>
        </div>
        <div className="space-y-2">
          {SESSIONS.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-600" />
                <div>
                  <p className="text-xs font-medium text-gray-300" dir="ltr">{s.device}</p>
                  <p className="text-[10px] text-gray-600" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{s.location} · {s.ip}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-[10px] text-gray-600" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{s.since}</p>
                {s.current ? (
                  <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontFamily: 'var(--font-ibm-arabic)' }}>الجلسة الحالية</span>
                ) : (
                  <button className="text-[10px] text-red-400 hover:text-red-300" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>إنهاء</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Log */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>سجل النشاط</h2>
        </div>
        <div className="space-y-1">
          {AUDIT.map((a, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: a.ok ? '#10b981' : '#ef4444' }} />
                <span className="text-xs text-gray-300" style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{a.action}</span>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-gray-600">
                <span dir="ltr">{a.user}</span>
                <span style={{ fontFamily: 'var(--font-ibm-arabic)' }}>{a.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
