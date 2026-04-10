'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type SyncState = 'idle' | 'loading' | 'success' | 'error';

interface SyncSummary {
  inserted: number;
  updated: number;
  skipped: number;
}

interface SyncThingSpeakButtonProps {
  /** Called after a successful sync so the parent can refresh its data */
  onSynced?: (summary: SyncSummary) => void;
}

export default function SyncThingSpeakButton({ onSynced }: SyncThingSpeakButtonProps) {
  const [state, setState]     = useState<SyncState>('idle');
  const [toast, setToast]     = useState<string | null>(null);

  const showToast = (msg: string, duration = 4000) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  };

  const handleSync = async () => {
    if (state === 'loading') return;

    setState('loading');
    setToast(null);

    try {
      // Retrieve the current session token to authenticate the Edge Function call
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const edgeFunctionUrl =
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-thingspeak-channels`;

      const res = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      const body = await res.json();

      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const summary: SyncSummary = {
        inserted: body.inserted ?? 0,
        updated:  body.updated  ?? 0,
        skipped:  body.skipped  ?? 0,
      };

      setState('success');
      showToast(`✅ تمت المزامنة — ${summary.inserted} جديد · ${summary.updated} محدَّث · ${summary.skipped} متجاهَل`);
      onSynced?.(summary);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState('error');
      showToast(`❌ فشل المزامنة: ${msg}`);
    } finally {
      // Return to idle after a short pause so the icon animates back
      setTimeout(() => setState('idle'), 3000);
    }
  };

  // ── Derived styles ────────────────────────────────────────
  const isLoading = state === 'loading';
  const isSuccess = state === 'success';
  const isError   = state === 'error';

  const accent =
    isSuccess ? '#10b981' :
    isError   ? '#ef4444' :
    '#a78bfa';                 // purple = ThingSpeak brand colour in the app

  return (
    <div className="relative inline-flex flex-col items-end gap-2">
      <button
        onClick={handleSync}
        disabled={isLoading}
        aria-label="مزامنة المولدات مع ThingSpeak"
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all select-none"
        style={{
          background:   `rgba(${isSuccess ? '16,185,129' : isError ? '239,68,68' : '167,139,250'}, 0.15)`,
          border:       `1px solid rgba(${isSuccess ? '16,185,129' : isError ? '239,68,68' : '167,139,250'}, 0.35)`,
          color:        accent,
          cursor:       isLoading ? 'not-allowed' : 'pointer',
          opacity:      isLoading ? 0.75 : 1,
          fontFamily:  'var(--font-ibm-arabic)',
        }}
      >
        {isSuccess ? (
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        ) : isError ? (
          <XCircle className="w-4 h-4 flex-shrink-0" />
        ) : (
          <RefreshCw
            className={`w-4 h-4 flex-shrink-0 ${isLoading ? 'animate-spin' : ''}`}
          />
        )}
        {isLoading ? 'جاري المزامنة…' : 'مزامنة مع ThingSpeak'}
      </button>

      {/* Toast notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-full mt-2 end-0 z-50 w-80 rounded-xl px-4 py-3 text-sm shadow-xl"
          style={{
            background:  'rgba(15,15,20,0.95)',
            border:      `1px solid ${isError ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
            color:       'var(--text-1)',
            fontFamily: 'var(--font-ibm-arabic)',
            direction:   'rtl',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
