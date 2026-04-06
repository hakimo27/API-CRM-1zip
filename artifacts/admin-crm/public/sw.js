// Байдабаза CRM Service Worker
const CACHE_NAME = 'baidabaza-crm-v3';
const BASE = '/crm/';
const SHELL_ASSETS = [BASE, BASE + 'index.html', BASE + 'offline.html'];

// ─── Install: cache shell ─────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(SHELL_ASSETS).catch(() => {})
    ).then(() => self.skipWaiting())
  );
});

// ─── Activate: clean old caches ──────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Never intercept API / WebSocket
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  // ── Navigation requests: network-first, fall back to SPA shell ──────────
  // Critically: even a non-2xx HTTP response (e.g. Vite 404 in dev) should
  // fall back to index.html so the SPA router can handle the route.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(response => {
        // If the server returned a successful HTML page, use it.
        if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
          return response;
        }
        // Server returned an error (e.g. 404) — serve the SPA shell instead.
        return caches.match(BASE + 'index.html').then(shell =>
          shell || caches.match(BASE) || response
        );
      }).catch(async () => {
        // Network failure (offline) — try cached shell, then offline page.
        const shell = await caches.match(BASE + 'index.html') || await caches.match(BASE);
        if (shell) return shell;
        const offline = await caches.match(BASE + 'offline.html');
        return offline || new Response('Нет подключения к сети', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
    );
    return;
  }

  // ── Static assets: cache-first (JS/CSS/fonts/images fingerprinted by Vite) ─
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|webp)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        }).catch(() => cached || new Response('', { status: 404 }));
      })
    );
    return;
  }

  // ── Everything else: network-first ────────────────────────────────────────
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ─── Push: show notification ─────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch (e) {
    data = { title: 'Байдабаза', body: event.data?.text() || 'Новое уведомление' };
  }

  const title = data.title || 'Байдабаза CRM';
  const options = {
    body: data.body || 'У вас новое уведомление',
    icon: BASE + 'icons/icon-192.png',
    badge: BASE + 'icons/icon-192.png',
    tag: data.tag || 'baidabaza-crm-notification',
    data: { url: data.url || BASE },
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click: focus or open CRM tab ───────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || BASE;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes('/crm'));
      if (existing) {
        existing.focus();
        if (targetUrl !== BASE) existing.navigate(targetUrl);
        return;
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
