// Байдабаза CRM Service Worker
const CACHE_NAME = 'baidabaza-crm-v2';
const SHELL_ASSETS = ['/crm/', '/crm/index.html', '/crm/offline.html'];

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

// ─── Fetch: network-first, fallback to cache for navigation ──────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // For API/WebSocket requests, always go network
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/socket.io/')) return;

  // For navigation requests: network-first, fallback to offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const shell = await caches.match('/crm/index.html');
        if (shell) return shell;
        const offline = await caches.match('/crm/offline.html');
        return offline || new Response('Нет подключения к сети', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
    );
    return;
  }

  // For static assets: cache-first (JS/CSS/fonts/images)
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

  // For other requests: network-first
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
    icon: '/crm/icons/icon-192.png',
    badge: '/crm/icons/icon-192.png',
    tag: data.tag || 'baidabaza-crm-notification',
    data: { url: data.url || '/crm/' },
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click: focus or open CRM tab ───────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/crm/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes('/crm'));
      if (existing) {
        existing.focus();
        if (targetUrl !== '/crm/') existing.navigate(targetUrl);
        return;
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
