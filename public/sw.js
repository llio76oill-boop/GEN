const CACHE_NAME = 'spgms-v2';
const OFFLINE_URL = '/offline.html';

const APP_SHELL = [
  '/',
  '/dashboard',
  '/dashboard/map',
  '/dashboard/faults',
  '/dashboard/analytics',
  '/dashboard/generators',
  '/dashboard/owners',
  '/dashboard/notifications',
  '/dashboard/security',
  '/dashboard/docs',
  '/dashboard/settings',
  '/owners',
  '/citizen',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/offline.html',
];

// ─── Install: cache the App Shell ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[SW] Some shell resources failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate: purge old caches ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch strategy ───
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // ── RSC prefetch requests → silently return 204 on failure ──
  if (request.url.includes('__next.') && request.url.includes('.txt')) {
    event.respondWith(
      fetch(request).then((res) => {
        if (!res.ok) return new Response('', { status: 204 });
        return res;
      }).catch(() => new Response('', { status: 204 }))
    );
    return;
  }

  // ── Supabase / external API → network-only (no caching) ──
  if (request.url.includes('supabase.co') || request.url.includes('api.')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // ── Static assets (JS, CSS, fonts, images) → cache-first ──
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    request.url.match(/\.(js|css|woff2?|ttf|svg|png|jpg|ico)(\?|$)/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => caches.match(request));
      })
    );
    return;
  }

  // ── HTML pages → network-first, cache fallback, then offline page ──
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          return caches.match(OFFLINE_URL).then((offline) => offline || createOfflineResponse());
        })
      )
  );
});

function createOfflineResponse() {
  return new Response(
    `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>وضع عدم الاتصال — S.P.G.M.S</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,sans-serif;background:#080810;color:#ededed;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}
.c{max-width:400px;padding:2rem}
.icon{font-size:3.5rem;margin-bottom:1.25rem}
h1{font-size:1.4rem;margin-bottom:.75rem;color:#10b981;font-weight:600}
p{color:#9ca3af;line-height:1.7;font-size:.95rem}
.dots{margin-top:1.5rem}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;margin:0 4px;animation:p 1.4s infinite}
.dot:nth-child(2){animation-delay:.2s}
.dot:nth-child(3){animation-delay:.4s}
@keyframes p{0%,80%,100%{opacity:.25;transform:scale(.7)}40%{opacity:1;transform:scale(1)}}
</style>
</head>
<body>
<div class="c">
<div class="icon">⚡</div>
<h1>وضع عدم الاتصال</h1>
<p>لا يوجد اتصال بالشبكة حالياً<br>جاري إعادة الاتصال تلقائياً...</p>
<div class="dots">
<span class="dot"></span><span class="dot"></span><span class="dot"></span>
</div>
</div>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
