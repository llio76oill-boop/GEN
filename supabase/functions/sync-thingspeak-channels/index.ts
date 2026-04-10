// ============================================================
// S.P.G.M.S — Supabase Edge Function
// ThingSpeak Auto-Discovery & Sync  v3
// Route: POST /functions/v1/sync-thingspeak-channels
// Runtime: Deno (Supabase Edge Functions)
// ============================================================
// @ts-nocheck
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

function extractFieldsMap(ch: ThingSpeakChannel): Record<string, string> {
  const map: Record<string, string> = {};
  for (let i = 1; i <= 8; i++) {
    const label = ch[`field${i}` as keyof ThingSpeakChannel] as string | undefined;
    if (label?.trim()) map[`field${i}`] = label.trim();
  }
  return map;
}

// ── CORS ─────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

const jsonResp = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// ── Paginated ThingSpeak fetch ────────────────────────────────
// page_size=100 is the ThingSpeak max; we loop until a short page.
// Supports up to 30 pages = 3,000 channels.
async function fetchAllChannels(apiKey: string): Promise<ThingSpeakChannel[]> {
  const PAGE_SIZE = 100;
  const MAX_PAGES = 30;
  const all: ThingSpeakChannel[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `https://api.thingspeak.com/channels.json?api_key=${apiKey}&page_size=${PAGE_SIZE}&page=${page}`;
    const safeUrl = url.replace(apiKey, apiKey.slice(0, 6) + '...');
    console.log(`[sync] Page ${page} → ${safeUrl}`);

    const res = await fetch(url);
    console.log(`[sync]   HTTP ${res.status}`);

    if (!res.ok) {
      const body = await res.text();
      console.error(`[sync]   ThingSpeak error: ${body.slice(0, 300)}`);
      throw new Error(`ThingSpeak HTTP ${res.status} on page ${page}: ${body.slice(0, 120)}`);
    }

    const raw = await res.json();
    const snippet = JSON.stringify(raw).slice(0, 300);
    console.log(`[sync]   Response shape: ${Array.isArray(raw) ? 'array' : typeof raw} — ${snippet}`);

    let batch: ThingSpeakChannel[];
    if (Array.isArray(raw)) {
      batch = raw;
    } else if (raw && Array.isArray(raw.channels)) {
      // Some API versions wrap in { channels: [...] }
      batch = raw.channels;
    } else {
      throw new Error(`Unexpected ThingSpeak shape: ${snippet}`);
    }

    console.log(`[sync]   Page ${page}: ${batch.length} channel(s)`);

    batch.forEach((ch, i) => {
      const readKey = ch.api_keys?.find((k) => !k.write_flag)?.api_key;
      const safe = readKey ? readKey.slice(0, 6) + '...' : '(none)';
      console.log(`[sync]     [${(page - 1) * PAGE_SIZE + i}] id=${ch.id} name="${ch.name}" readKey=${safe} fields=${JSON.stringify(extractFieldsMap(ch))}`);
    });

    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return all;
}

// ── Main handler ─────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return jsonResp({ ok: false, error: 'Method Not Allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    console.error('[sync] 401 — no Bearer token');
    return jsonResp({ ok: false, error: 'Unauthorized — Bearer token required' }, 401);
  }
  console.log('[sync] Auth ✓');

  const userApiKey = Deno.env.get('THINGSPEAK_USER_API');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

  if (!userApiKey) {
    console.error('[sync] THINGSPEAK_USER_API not set');
    return jsonResp({ ok: false, error: 'THINGSPEAK_USER_API secret not configured in Supabase Vault' }, 500);
  }

  // 1. Fetch all ThingSpeak channels (paginated)
  let channels: ThingSpeakChannel[];
  try {
    channels = await fetchAllChannels(userApiKey);
  } catch (err) {
    console.error('[sync] fetchAllChannels error:', String(err));
    return jsonResp({ ok: false, error: String(err) }, 502);
  }

  if (channels.length === 0) {
    console.warn('[sync] 0 channels returned — check User API Key');
    return jsonResp({ ok: false, error: 'ThingSpeak returned 0 channels — verify THINGSPEAK_USER_API in Supabase Vault' }, 502);
  }

  console.log(`[sync] Total channels: ${channels.length}`);

  // 2. Supabase client
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 3. Find real owner
  const { data: ownerRow } = await supabase
    .from('owners')
    .select('id')
    .eq('is_mock', false)
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();
  const ownerId = ownerRow?.id ?? 1;
  console.log(`[sync] owner_id: ${ownerId}`);

  // 4. Load existing channel IDs
  const { data: existing, error: fetchErr } = await supabase
    .from('owned_generators')
    .select('id, thingspeak_channel_id')
    .not('thingspeak_channel_id', 'is', null);

  if (fetchErr) {
    console.error('[sync] Load existing error:', fetchErr.message);
    return jsonResp({ ok: false, error: fetchErr.message }, 500);
  }

  const existingMap = new Map(
    (existing ?? []).map((r: { thingspeak_channel_id: string; id: number }) => [
      r.thingspeak_channel_id, r.id,
    ]),
  );
  console.log(`[sync] Existing rows in DB: ${existingMap.size}`);

  // 5. Build upsert rows
  const upsertRows = channels.map((ch) => {
    const channelId = String(ch.id);
    const readKey = ch.api_keys?.find((k) => !k.write_flag)?.api_key ?? null;
    const fieldsMap = extractFieldsMap(ch);
    const existingId = existingMap.get(channelId);

    const row: Record<string, unknown> = {
      owner_id: ownerId,
      code: ch.name?.trim() || `CH-${channelId}`,
      thingspeak_channel_id: channelId,
      thingspeak_read_key: readKey,
      thingspeak_fields_map: Object.keys(fieldsMap).length ? fieldsMap : null,
      is_mock: false,
    };

    if (existingId !== undefined) {
      row.id = existingId;
    } else {
      row.area = 'غير محدد';
      row.power = 0;
      row.status = 'offline';
      row.total_hours = 0;
    }

    return row;
  });

  const toInsert = upsertRows.filter((r) => r.id === undefined).length;
  const toUpdate = upsertRows.filter((r) => r.id !== undefined).length;
  console.log(`[sync] Upserting — insert: ${toInsert}, update: ${toUpdate}`);

  const { error: upsertErr } = await supabase
    .from('owned_generators')
    .upsert(upsertRows, {
      onConflict: 'thingspeak_channel_id',
      ignoreDuplicates: false,
    });

  if (upsertErr) {
    console.error('[sync] Upsert error:', upsertErr.message, 'code:', upsertErr.code);
    if (upsertErr.code === '42P10' || upsertErr.message?.includes('no unique or exclusion constraint')) {
      return jsonResp({
        ok: false,
        error: 'يرجى تشغيل migrate-fields-map.sql في Supabase SQL Editor — UNIQUE constraint مفقود على thingspeak_channel_id',
      }, 500);
    }
    return jsonResp({ ok: false, error: upsertErr.message }, 500);
  }

  console.log(`[sync] ✓ Done — inserted: ${toInsert}, updated: ${toUpdate}`);

  return jsonResp({
    ok: true,
    summary: `${toInsert} مُضاف · ${toUpdate} مُحدَّث`,
    inserted: toInsert,
    updated: toUpdate,
    skipped: 0,
    total: channels.length,
  });
});
