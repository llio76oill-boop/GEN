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
  field1?: string; field2?: string; field3?: string;
  field4?: string; field5?: string; field6?: string;
  field7?: string; field8?: string;
  api_keys?: Array<{ api_key: string; write_flag: boolean }>;
}

// Build a JSONB-ready mapping of non-empty field labels
function extractFieldsMap(ch: ThingSpeakChannel): Record<string, string> {
  const map: Record<string, string> = {};
  for (let i = 1; i <= 8; i++) {
    const key   = `field${i}` as keyof ThingSpeakChannel;
    const label = ch[key] as string | undefined;
    if (label && label.trim()) map[`field${i}`] = label.trim();
  }
  return map;
}

interface SyncResult {
  inserted: number;
  updated:  number;
  skipped:  number;
}

// ── CORS ─────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// ── Main handler ─────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST')    return json({ ok: false, error: 'Method Not Allowed' }, 405);

  // ── 1. Auth: require a Bearer token (anon key or user JWT) ──
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    console.error('[sync] 401 — missing or malformed Authorization header');
    return json({ ok: false, error: 'Unauthorized — Bearer token required' }, 401);
  }
  console.log('[sync] Auth header present ✓');

  // ── 2. Validate secrets ─────────────────────────────────────
  const userApiKey     = Deno.env.get('THINGSPEAK_USER_API');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseUrl    = Deno.env.get('SUPABASE_URL') ?? '';

  if (!userApiKey) {
    console.error('[sync] THINGSPEAK_USER_API secret is not set');
    return json({ ok: false, error: 'THINGSPEAK_USER_API secret not configured' }, 500);
  }
  console.log('[sync] Secrets loaded ✓ — fetching channels from ThingSpeak…');

  // ── 3. Fetch all channels from ThingSpeak User API ──────────
  let channels: ThingSpeakChannel[];
  try {
    const tsRes = await fetch(
      `https://api.thingspeak.com/channels.json?api_key=${userApiKey}`,
    );
    console.log(`[sync] ThingSpeak HTTP status: ${tsRes.status}`);
    if (!tsRes.ok) {
      const body = await tsRes.text();
      console.error(`[sync] ThingSpeak error body: ${body}`);
      return json({ ok: false, error: `ThingSpeak returned HTTP ${tsRes.status}` }, 502);
    }
    channels = await tsRes.json();
    console.log(`[sync] ThingSpeak raw response type: ${Array.isArray(channels) ? 'array' : typeof channels}`);
    if (!Array.isArray(channels)) {
      console.error('[sync] Unexpected shape — response is not an array:', JSON.stringify(channels).slice(0, 200));
      return json({ ok: false, error: 'Unexpected ThingSpeak response shape' }, 502);
    }
  } catch (err) {
    console.error('[sync] fetch() to ThingSpeak threw:', String(err));
    return json({ ok: false, error: `ThingSpeak fetch failed: ${String(err)}` }, 502);
  }

  console.log(`[sync] ${channels.length} channel(s) returned by ThingSpeak`);
  channels.forEach((ch, i) => {
    const readKey = ch.api_keys?.find((k) => !k.write_flag)?.api_key ?? '(none)';
    console.log(`[sync]   [${i}] id=${ch.id} name="${ch.name}" readKey=${readKey.slice(0, 6)}… fields=${JSON.stringify(extractFieldsMap(ch))}`);
  });

  // ── 4. Connect to Supabase (service role — bypasses RLS) ────
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── 5. Look up the real owner row ────────────────────────────
  const { data: ownerRow } = await supabase
    .from('owners')
    .select('id')
    .eq('is_mock', false)
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();
  const ownerId = ownerRow?.id ?? 1;
  console.log(`[sync] Real owner id: ${ownerId}`);

  // ── 6. Load existing channel IDs to classify INSERT vs UPDATE ─
  const { data: existing, error: fetchErr } = await supabase
    .from('owned_generators')
    .select('id, thingspeak_channel_id, code')
    .not('thingspeak_channel_id', 'is', null);

  if (fetchErr) {
    console.error('[sync] Failed to load existing rows:', fetchErr.message);
    return json({ ok: false, error: fetchErr.message }, 500);
  }

  const existingMap = new Map(
    (existing ?? []).map((r: { thingspeak_channel_id: string; id: number; code: string }) => [
      r.thingspeak_channel_id,
      r,
    ]),
  );
  console.log(`[sync] Existing owned_generators with a channel_id: ${existingMap.size}`);

  // ── 7. Build upsert rows ─────────────────────────────────────
  //  requires: owned_generators.thingspeak_channel_id has a UNIQUE constraint
  //  (run migrate-fields-map.sql in the Supabase SQL Editor first)
  const upsertRows = channels.map((ch) => {
    const channelId = String(ch.id);
    const readKey   = ch.api_keys?.find((k) => !k.write_flag)?.api_key ?? null;
    const fieldsMap = extractFieldsMap(ch);
    const existing  = existingMap.get(channelId);

    return {
      ...(existing ? { id: existing.id } : {}),   // include PK so upsert updates correctly
      owner_id:                ownerId,
      code:                    ch.name || `CH-${channelId}`,
      area:                    existing ? undefined : 'غير محدد',  // don't overwrite area on update
      power:                   existing ? undefined : 0,
      status:                  existing ? undefined : 'offline',
      total_hours:             existing ? undefined : 0,
      thingspeak_channel_id:   channelId,
      thingspeak_read_key:     readKey,
      thingspeak_fields_map:   Object.keys(fieldsMap).length ? fieldsMap : null,
      is_mock:                 false,
    };
  });

  // Remove undefined values (partial updates on existing rows)
  const cleanRows = upsertRows.map((r) =>
    Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)),
  );

  console.log(`[sync] Upserting ${cleanRows.length} row(s)…`);

  const { error: upsertErr, count } = await supabase
    .from('owned_generators')
    .upsert(cleanRows, {
      onConflict:      'thingspeak_channel_id',   // requires UNIQUE constraint
      ignoreDuplicates: false,                      // always overwrite read_key + fields_map
      count:           'exact',
    });

  if (upsertErr) {
    console.error('[sync] Upsert failed:', upsertErr.message, '| code:', upsertErr.code);
    // Graceful fallback diagnostic message
    if (upsertErr.code === '42P10' || upsertErr.message?.includes('there is no unique or exclusion constraint')) {
      console.error('[sync] → UNIQUE constraint missing on thingspeak_channel_id. Run migrate-fields-map.sql first.');
      return json({
        ok: false,
        error: 'DB: missing UNIQUE constraint on thingspeak_channel_id — run migrate-fields-map.sql in Supabase SQL Editor',
      }, 500);
    }
    return json({ ok: false, error: upsertErr.message }, 500);
  }

  const result: SyncResult = {
    inserted: channels.filter((ch) => !existingMap.has(String(ch.id))).length,
    updated:  channels.filter((ch) =>  existingMap.has(String(ch.id))).length,
    skipped:  0,
  };

  console.log(`[sync] ✓ Done — inserted: ${result.inserted}, updated: ${result.updated}, count: ${count}`);

  return json({
    ok:      true,
    summary: `${result.inserted} added · ${result.updated} updated`,
    ...result,
  });
});

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
  // Dynamic field labels configured by the user in ThingSpeak
  field1?: string; field2?: string; field3?: string;
  field4?: string; field5?: string; field6?: string;
  field7?: string; field8?: string;
  // The User key response includes api_keys array
  api_keys?: Array<{ api_key: string; write_flag: boolean }>;
}

// Build a JSONB-ready mapping of non-empty field labels
function extractFieldsMap(ch: ThingSpeakChannel): Record<string, string> {
  const map: Record<string, string> = {};
  for (let i = 1; i <= 8; i++) {
    const key = `field${i}` as keyof ThingSpeakChannel;
    const label = ch[key] as string | undefined;
    if (label && label.trim()) map[`field${i}`] = label.trim();
  }
  return map;
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

    // Extract JSONB field-name map: { field1: "voltage", field2: "current", … }
    const fieldsMap = extractFieldsMap(ch);

    if (existingMap.has(channelId)) {
      // ── UPDATE: refresh name, read key, and field map ─────
      const existing = existingMap.get(channelId)!;
      const { error } = await supabase
        .from('owned_generators')
        .update({
          ...(ch.name                       ? { code: ch.name }                       : {}),
          ...(readKey                        ? { thingspeak_read_key: readKey }        : {}),
          ...(Object.keys(fieldsMap).length  ? { thingspeak_fields_map: fieldsMap }   : {}),
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
      const { data: ownerRow } = await supabase
        .from('owners')
        .select('id')
        .eq('is_mock', false)
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      const ownerId = ownerRow?.id ?? 1;

      const { error } = await supabase.from('owned_generators').insert({
        owner_id:                ownerId,
        code:                    ch.name || `CH-${channelId}`,
        area:                    'غير محدد',
        power:                   0,
        status:                  'offline',
        total_hours:             0,
        thingspeak_channel_id:   channelId,
        thingspeak_read_key:     readKey,
        thingspeak_fields_map:   Object.keys(fieldsMap).length ? fieldsMap : null,
        is_mock:                 false,
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
