'use client';

// ============================================================
// LiveTelemetryBadge
// Per-channel independent poller: fetches the latest ThingSpeak
// feed entry every 15 seconds and renders a contextual widget
// based on thingspeak_fields_map.
//
// Props:
//   channelId   — ThingSpeak channel numeric ID (string)
//   readApiKey  — Channel read API key
//   fieldsMap   — JSONB map e.g. { field1: 'voltage', ... }
//                 Falls back to { field1: 'voltage' } if null
//   compact     — Single-line variant for table rows (default true)
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { Zap, Activity, AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type FieldType = 'voltage' | 'current' | 'power' | 'generic';
type FetchStatus = 'idle' | 'loading' | 'ok' | 'error';

interface FieldReading {
  key:   string;       // "field1"
  label: string;       // "voltage" (raw from map)
  type:  FieldType;
  value: number | null;
}

interface Props {
  channelId:    string;
  readApiKey:   string | null;
  fieldsMap?:   Record<string, string> | null;
  compact?:     boolean;
  pollMs?:      number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const FALLBACK_MAP: Record<string, string> = { field1: 'voltage' };

function classifyField(label: string): FieldType {
  const l = label.toLowerCase();
  if (l.includes('volt') || l.includes('فولت'))             return 'voltage';
  if (l.includes('curr') || l.includes('amp') || l.includes('أمبير') || l.includes('تيار')) return 'current';
  if (l.includes('power') || l.includes('watt') || l.includes('قدرة') || l.includes('واط')) return 'power';
  return 'generic';
}

function voltageColor(v: number): string {
  if (v < 180)  return '#ef4444';
  if (v < 210)  return '#f97316';
  if (v <= 240) return '#10b981';
  if (v <= 260) return '#f59e0b';
  return '#ef4444';
}

function voltageLabel(v: number): string {
  if (v < 180)  return 'منخفض جداً';
  if (v < 210)  return 'منخفض';
  if (v <= 240) return 'طبيعي';
  if (v <= 260) return 'مرتفع';
  return 'مرتفع جداً';
}

// ── Compact inline badge (for table rows / list items) ────────────────────────

function CompactReading({ reading }: { reading: FieldReading }) {
  if (reading.value === null) {
    return (
      <span className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>—</span>
    );
  }

  if (reading.type === 'voltage') {
    const color = voltageColor(reading.value);
    const label = voltageLabel(reading.value);
    return (
      <span className="flex items-center gap-1.5 flex-shrink-0">
        <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
        <span className="text-base font-bold tabular-nums font-mono" style={{ color }}>
          {reading.value.toFixed(1)}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-5)' }}>V</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-md"
              style={{ background: `${color}14`, color, fontFamily: 'var(--font-ibm-arabic)' }}>
          {label}
        </span>
      </span>
    );
  }

  if (reading.type === 'current') {
    return (
      <span className="flex items-center gap-1.5 flex-shrink-0">
        <Activity className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#3b82f6' }} />
        <span className="text-base font-bold tabular-nums font-mono" style={{ color: '#3b82f6' }}>
          {reading.value.toFixed(2)}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-5)' }}>A</span>
      </span>
    );
  }

  if (reading.type === 'power') {
    const kw = (reading.value / 1000).toFixed(2);
    return (
      <span className="flex items-center gap-1.5 flex-shrink-0">
        <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#a855f7' }} />
        <span className="text-base font-bold tabular-nums font-mono" style={{ color: '#a855f7' }}>
          {reading.value >= 1000 ? kw : reading.value.toFixed(0)}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-5)' }}>
          {reading.value >= 1000 ? 'kW' : 'W'}
        </span>
      </span>
    );
  }

  // generic
  return (
    <span className="text-sm font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>
      {reading.value.toFixed(2)}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LiveTelemetryBadge({
  channelId,
  readApiKey,
  fieldsMap,
  compact  = true,
  pollMs   = 15_000,
}: Props) {
  const [readings,    setReadings]    = useState<FieldReading[]>([]);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle');
  const [errorCode,   setErrorCode]   = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resolve which fields to track
  const resolvedMap: Record<string, string> = fieldsMap && Object.keys(fieldsMap).length
    ? fieldsMap
    : FALLBACK_MAP;

  const activeFields = Object.keys(resolvedMap);

  const fetchLatest = async () => {
    if (!channelId || !readApiKey) {
      setFetchStatus('error');
      return;
    }

    setFetchStatus('loading');

    // Request only the active field numbers to minimise payload
    const fieldNums = activeFields.map((k) => k.replace('field', '')).join(',');
    const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readApiKey}&results=1&fields=${fieldNums}`;

    try {
      const res = await fetch(url);
      setErrorCode(res.status);

      if (!res.ok) {
        setFetchStatus('error');
        return;
      }

      const json  = await res.json();
      const feed  = (json.feeds ?? [])[0] ?? {};

      const newReadings: FieldReading[] = activeFields.map((fk) => {
        const raw   = feed[fk] as string | null | undefined;
        const num   = raw != null ? parseFloat(raw) : NaN;
        return {
          key:   fk,
          label: resolvedMap[fk],
          type:  classifyField(resolvedMap[fk]),
          value: isNaN(num) ? null : num,
        };
      });

      setReadings(newReadings);
      setLastUpdated(feed.created_at ?? new Date().toISOString());
      setFetchStatus('ok');
      setErrorCode(null);
    } catch {
      setFetchStatus('error');
    }
  };

  // Mount + interval
  useEffect(() => {
    fetchLatest();
    timerRef.current = setInterval(fetchLatest, pollMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, readApiKey, pollMs]);

  // ── No API key ─────────────────────────────────────────────────────────────
  if (!readApiKey) {
    return (
      <span className="flex items-center gap-1.5 text-xs"
            style={{ color: '#f97316', fontFamily: 'var(--font-ibm-arabic)' }}>
        <AlertTriangle className="w-3.5 h-3.5" />
        مفتاح القراءة مفقود
      </span>
    );
  }

  // ── Error (400 / 403 = bad key) ────────────────────────────────────────────
  if (fetchStatus === 'error') {
    const isBadKey = errorCode === 400 || errorCode === 403;
    return (
      <span className="flex items-center gap-1.5 text-xs"
            style={{ color: '#ef4444', fontFamily: 'var(--font-ibm-arabic)' }}>
        <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
        {isBadKey ? 'تحقق من مفتاح القراءة' : 'خطأ في الجلب'}
      </span>
    );
  }

  // ── Loading (first fetch) ──────────────────────────────────────────────────
  if (fetchStatus === 'loading' && readings.length === 0) {
    return (
      <span className="flex items-center gap-1.5">
        <RefreshCw className="w-3 h-3 animate-spin" style={{ color: 'var(--text-5)' }} />
        <span className="text-xs" style={{ color: 'var(--text-5)', fontFamily: 'var(--font-ibm-arabic)' }}>
          جارٍ الجلب…
        </span>
      </span>
    );
  }

  // ── Compact mode: show all readings inline ─────────────────────────────────
  if (compact) {
    return (
      <span className="flex items-center gap-3 flex-wrap">
        {readings.map((r) => (
          <CompactReading key={r.key} reading={r} />
        ))}
        {fetchStatus === 'loading' && (
          <RefreshCw className="w-2.5 h-2.5 animate-spin" style={{ color: 'var(--text-5)' }} />
        )}
        {lastUpdated && (
          <span className="text-[9px]" style={{ color: 'var(--text-5)' }}>
            {new Date(lastUpdated).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </span>
    );
  }

  // ── Full mode: stacked cards (used outside table rows) ────────────────────
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {readings.map((r) => (
        <div key={r.key} className="glass-card px-3 py-2 flex items-center gap-2">
          <CompactReading reading={r} />
        </div>
      ))}
    </div>
  );
}
