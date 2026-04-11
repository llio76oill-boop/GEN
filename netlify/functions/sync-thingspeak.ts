import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface ThingSpeakChannel {
  id: number;
  name: string;
  field1?: string; field2?: string; field3?: string;
  field4?: string; field5?: string; field6?: string;
  field7?: string; field8?: string;
  api_keys?: Array<{ api_key: string; write_flag: boolean }>;
}

function extractFieldsMap(ch: ThingSpeakChannel): Record<string, string> {
  const map: Record<string, string> = {};
  for (let i = 1; i <= 8; i++) {
    const label = (ch as unknown as Record<string, unknown>)[`field${i}`] as string | undefined;
    if (label?.trim()) map[`field${i}`] = label.trim();
  }
  return map;
}

async function fetchAllChannels(apiKey: string): Promise<ThingSpeakChannel[]> {
  const PAGE_SIZE = 100;
  const all: ThingSpeakChannel[] = [];
  for (let page = 1; page <= 30; page++) {
    const url = `https://api.thingspeak.com/channels.json?api_key=${apiKey}&page_size=${PAGE_SIZE}&page=${page}`;
    console.log(`[sync] Fetching page ${page}…`);
    const res = await fetch(url);
    console.log(`[sync] HTTP ${res.status}`);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ThingSpeak HTTP ${res.status}: ${body.slice(0, 120)}`);
    }
    const raw = await res.json();
    console.log(`[sync] Response snippet: ${JSON.stringify(raw).slice(0, 300)}`);
    let batch: ThingSpeakChannel[];
    if (Array.isArray(raw)) batch = raw;
    else if (raw?.channels && Array.isArray(raw.channels)) batch = raw.channels;
    else throw new Error(`Unexpected ThingSpeak shape: ${JSON.stringify(raw).slice(0, 200)}`);
    console.log(`[sync] Page ${page}: ${batch.length} channels`);
    batch.forEach((ch, i) => {
      const rk = ch.api_keys?.find((k) => !k.write_flag)?.api_key;
      console.log(`[sync]   [${(page - 1) * PAGE_SIZE + i}] id=${ch.id} name="${ch.name}" readKey=${rk ? rk.slice(0, 6) + '…' : '(none)'} fields=${JSON.stringify(extractFieldsMap(ch))}`);
    });
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return all;
}

export const handler: Handler = async (event: HandlerEvent) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  const userApiKey     = process.env.THINGSPEAK_USER_API;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!userApiKey) {
    console.error('[sync] THINGSPEAK_USER_API env var not set');
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: 'THINGSPEAK_USER_API not configured — add it in Netlify → Site settings → Environment variables' }) };
  }
  if (!serviceRoleKey || !supabaseUrl) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: 'Supabase env vars not configured' }) };
  }

  // 1. Fetch all ThingSpeak channels
  let channels: ThingSpeakChannel[];
  try {
    channels = await fetchAllChannels(userApiKey);
  } catch (err) {
    console.error('[sync] fetchAllChannels error:', String(err));
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ ok: false, error: String(err) }) };
  }

  if (!channels.length) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ ok: false, error: 'ThingSpeak returned 0 channels — check THINGSPEAK_USER_API value' }) };
  }

  console.log(`[sync] Total channels from ThingSpeak: ${channels.length}`);

  // 2. Connect to Supabase (service role — bypasses RLS)
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
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: fetchErr.message }) };
  }

  const existingMap = new Map(
    (existing ?? []).map((r: { thingspeak_channel_id: string; id: number }) => [r.thingspeak_channel_id, r.id]),
  );
  console.log(`[sync] Existing rows in DB: ${existingMap.size}`);

  // 5. Build separate insert / update payloads
  //    Upsert sends an INSERT first, so all NOT NULL columns must be present.
  //    To avoid overwriting existing area/power/status with defaults, we split
  //    into two operations: INSERT new rows, UPDATE existing rows (channel fields only).
  const toInsertRows: Record<string, unknown>[] = [];
  const toUpdateRows: { id: number; code: string; thingspeak_read_key: string | null; thingspeak_fields_map: Record<string,string> | null; is_mock: boolean }[] = [];

  for (const ch of channels) {
    const channelId  = String(ch.id);
    const readKey    = ch.api_keys?.find((k) => !k.write_flag)?.api_key ?? null;
    const fieldsMap  = extractFieldsMap(ch);
    const existingId = existingMap.get(channelId);

    if (existingId !== undefined) {
      // Only update the ThingSpeak-related fields — don't touch area/power/status
      toUpdateRows.push({
        id:                    existingId,
        code:                  ch.name?.trim() || `CH-${channelId}`,
        thingspeak_read_key:   readKey,
        thingspeak_fields_map: Object.keys(fieldsMap).length ? fieldsMap : null,
        is_mock:               false,
      });
    } else {
      // Full row for INSERT (all NOT NULL columns required)
      toInsertRows.push({
        owner_id:              ownerId,
        code:                  ch.name?.trim() || `CH-${channelId}`,
        area:                  'غير محدد',
        power:                 0,
        status:                'offline',
        total_hours:           0,
        thingspeak_channel_id: channelId,
        thingspeak_read_key:   readKey,
        thingspeak_fields_map: Object.keys(fieldsMap).length ? fieldsMap : null,
        is_mock:               false,
      });
    }
  }

  console.log(`[sync] insert: ${toInsertRows.length}, update: ${toUpdateRows.length}`);

  // INSERT new channels
  if (toInsertRows.length > 0) {
    const { error: insertErr } = await supabase
      .from('owned_generators')
      .insert(toInsertRows);
    if (insertErr) {
      console.error('[sync] Insert error:', insertErr.message);
      if (insertErr.code === '23505') {
        // duplicate key — channel was added by a concurrent request, ignore
        console.warn('[sync] Duplicate key on insert — concurrent sync, not fatal');
      } else {
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: insertErr.message }) };
      }
    }
  }

  // UPDATE existing channels (channel fields only — preserves area/power/status)
  for (const row of toUpdateRows) {
    const { id, ...fields } = row;
    const { error: updateErr } = await supabase
      .from('owned_generators')
      .update(fields)
      .eq('id', id);
    if (updateErr) {
      console.error(`[sync] Update error for id=${id}:`, updateErr.message);
      // non-fatal — log and continue
    }
  }

  const inserted = toInsertRows.length;
  const updated  = toUpdateRows.length;
  console.log(`[sync] ✓ inserted: ${inserted}, updated: ${updated}`);
  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ ok: true, summary: `${inserted} مُضاف · ${updated} مُحدَّث`, inserted, updated, skipped: 0, total: channels.length }),
  };
};
