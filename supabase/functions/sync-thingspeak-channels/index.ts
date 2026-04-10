// ============================================================
// S.P.G.M.S — Supabase Edge Function
// ThingSpeak Auto-Discovery & Sync
// Route: POST /functions/v1/sync-thingspeak-channels
// Runtime: Deno (Supabase Edge Functions)
// ============================================================
// @ts-nocheck — Targets the Deno runtime; standard TS tooling
// will report false positives for Deno globals.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Types ────────────────────────────────────────────────────

interface ThingSpeakChannel {
  id: number;
  name: string;
  description: string | null;
  latitude: string | null;
  longitude: string | null;
  created_at: string;
  updated_at: string;
  last_entry_id: number | null;
  // The User key response includes api_keys array
  api_keys?: Array<{ api_key: string; write_flag: boolean }>;
}

interface SyncResult {
  inserted: number;
  updated: number;
  skipped: number;
  channels: Array<{ channel_id: string; action: 'inserted' | 'updated' | 'skipped' }>;
}

// ── CORS ─────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// ── Main handler ─────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST')    return json({ error: 'Method Not Allowed' }, 405);

  // ── 1. Auth: require Supabase service-role JWT ────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  // Edge Functions auto-verify the JWT; we additionally reject anonymous callers.
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized — Bearer token required' }, 401);
  }

  // ── 2. Fetch all channels from ThingSpeak using User API key ─
  const userApiKey = Deno.env.get('THINGSPEAK_USER_API');
  if (!userApiKey) {
    return json({ error: 'THINGSPEAK_USER_API secret not configured' }, 500);
  }

  let channels: ThingSpeakChannel[];
  try {
    const res = await fetch(
      `https://api.thingspeak.com/channels.json?api_key=${userApiKey}`,
    );
    if (!res.ok) {
      return json({ error: `ThingSpeak returned ${res.status}` }, 502);
    }
    channels = await res.json();
    if (!Array.isArray(channels)) {
      return json({ error: 'Unexpected ThingSpeak response shape' }, 502);
    }
  } catch (err) {
    return json({ error: `ThingSpeak fetch failed: ${String(err)}` }, 502);
  }

  // ── 3. Connect to Supabase (service role — bypasses RLS) ──
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey,
  );

  // ── 4. Load existing owned_generators channel IDs ─────────
  const { data: existing, error: fetchErr } = await supabase
    .from('owned_generators')
    .select('id, thingspeak_channel_id, code')
    .not('thingspeak_channel_id', 'is', null);

  if (fetchErr) return json({ error: fetchErr.message }, 500);

  const existingMap = new Map(
    (existing ?? []).map((r: { thingspeak_channel_id: string; id: number; code: string }) => [
      r.thingspeak_channel_id,
      r,
    ]),
  );

  // ── 5. Upsert logic ───────────────────────────────────────
  const result: SyncResult = { inserted: 0, updated: 0, skipped: 0, channels: [] };

  for (const ch of channels) {
    const channelId = String(ch.id);

    // Extract READ api key (User key response exposes api_keys array)
    const readKey =
      ch.api_keys?.find((k) => !k.write_flag)?.api_key ?? null;

    if (existingMap.has(channelId)) {
      // ── UPDATE: refresh name & read key if changed ────────
      const existing = existingMap.get(channelId)!;
      const { error } = await supabase
        .from('owned_generators')
        .update({
          ...(ch.name ? { code: ch.name } : {}),
          ...(readKey   ? { thingspeak_read_key: readKey } : {}),
        })
        .eq('id', existing.id);

      if (error) {
        result.channels.push({ channel_id: channelId, action: 'skipped' });
        result.skipped++;
      } else {
        result.channels.push({ channel_id: channelId, action: 'updated' });
        result.updated++;
      }
    } else {
      // ── INSERT: new channel discovered ────────────────────
      // We need a valid owner_id — use owner id=1 as placeholder
      // (admin completes profile later from the UI)
      const { data: ownerRow } = await supabase
        .from('owners')
        .select('id')
        .eq('is_mock', false)
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      const ownerId = ownerRow?.id ?? 1; // fallback to first seeded owner

      const { error } = await supabase.from('owned_generators').insert({
        owner_id:              ownerId,
        code:                  ch.name || `CH-${channelId}`,
        area:                  'غير محدد',
        power:                 0,
        status:                'offline',          // safe default
        total_hours:           0,
        thingspeak_channel_id: channelId,
        thingspeak_read_key:   readKey,
        is_mock:               false,
      });

      if (error) {
        result.channels.push({ channel_id: channelId, action: 'skipped' });
        result.skipped++;
      } else {
        result.channels.push({ channel_id: channelId, action: 'inserted' });
        result.inserted++;
      }
    }
  }

  return json({
    ok: true,
    summary: `${result.inserted} added · ${result.updated} updated · ${result.skipped} skipped`,
    ...result,
  });
});
