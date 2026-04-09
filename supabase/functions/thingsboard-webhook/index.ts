// ============================================================
// S.P.G.M.S — Supabase Edge Function
// ThingsBoard Rule-Engine Webhook Receiver
// Route: POST /functions/v1/thingsboard-webhook
// Runtime: Deno (Supabase Edge Functions)
// ============================================================
// @ts-nocheck — This file targets the Deno runtime; standard
// TypeScript tooling will report false positives for Deno globals.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Types ─────────────────────────────────────────────────────
interface ThingsBoardPayload {
  generator_code: string;
  status: 'online' | 'offline' | 'fault';
  current_load: number;
  voltage: number;
}

// ── CORS headers (tighten in production to TB server IP) ──────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-webhook-secret',
};

// ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Handle pre-flight CORS requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  // ── 1. Secret-token guard ─────────────────────────────────
  // TB Rule Engine Action → "Send HTTP Request" must include this header.
  // Set WEBHOOK_SECRET in Supabase Dashboard → Edge Functions → Secrets.
  const expectedSecret = Deno.env.get('WEBHOOK_SECRET');
  const incomingSecret = req.headers.get('x-webhook-secret');

  if (!expectedSecret || incomingSecret !== expectedSecret) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  // ── 2. Parse & validate body ──────────────────────────────
  let payload: ThingsBoardPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  const { generator_code, status, current_load, voltage } = payload;

  // Field presence check
  if (!generator_code || !status || current_load === undefined || voltage === undefined) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: generator_code, status, current_load, voltage' }),
      { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  // Status enum check
  const VALID_STATUSES = ['online', 'offline', 'fault'] as const;
  if (!VALID_STATUSES.includes(status)) {
    return new Response(
      JSON.stringify({ error: `Invalid status value. Allowed: ${VALID_STATUSES.join(', ')}` }),
      { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  // Numeric range sanity checks (prevents garbage data from reaching DB)
  if (typeof current_load !== 'number' || current_load < 0 || current_load > 10_000) {
    return new Response(
      JSON.stringify({ error: 'current_load must be a number between 0 and 10000 kW' }),
      { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
  if (typeof voltage !== 'number' || voltage < 0 || voltage > 50_000) {
    return new Response(
      JSON.stringify({ error: 'voltage must be a number between 0 and 50000 V' }),
      { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  // ── 3. Build Supabase service-role client ─────────────────
  // These are automatically injected into every Edge Function runtime.
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // ── 4. Upsert into generators_live_status ────────────────
  // Uses generator_code as the natural key (unique constraint required on that column).
  const { error: dbError } = await supabase
    .from('generators_live_status')
    .upsert(
      {
        generator_code,
        status,
        current_load,
        voltage,
        last_seen: new Date().toISOString(),
      },
      { onConflict: 'generator_code' },
    );

  if (dbError) {
    console.error('[thingsboard-webhook] DB error:', dbError.message);
    return new Response(
      JSON.stringify({ error: 'Database write failed', detail: dbError.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  // ── 5. Success ────────────────────────────────────────────
  return new Response(
    JSON.stringify({
      ok: true,
      generator_code,
      status,
      recorded_at: new Date().toISOString(),
    }),
    { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
  );
});
