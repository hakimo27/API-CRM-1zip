// Байдабаза CRM Service Worker
const CACHE_NAME = 'baidabaza-crm-v1';
const SHELL_ASSETS = ['/crm/', '/crm/index.html'];

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

  // For API requests, always go network
  if (url.pathname.startsWith('/api/')) return;

  // For navigation requests, network-first then cached shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/crm/index.html').then(r => r || fetch(event.request))
      )
    );
    return;
  }

  // For other assets, try network first
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
    tag: data.tag || 'baidabaza-notification',
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
      // Find existing CRM tab
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
