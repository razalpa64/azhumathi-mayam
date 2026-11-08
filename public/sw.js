/*
 * Azhimathi Mayam service worker — deliberately conservative.
 *
 * What it does:
 *  - makes the site installable and gives static assets (JS/CSS chunks,
 *    icons, logo) a cache-first lane so repeat opens feel instant
 *  - if a page navigation fails (no signal in the library basement),
 *    shows the offline page instead of a browser error
 *
 * What it never does:
 *  - cache API responses, auth, or any page HTML — notes are personal
 *    and freshness matters more than shaving milliseconds here.
 */

const VERSION = 'azm-v2';
const STATIC_CACHE = VERSION + '-static';

const PRECACHE = [
  '/offline',
  '/brand/logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Google Drive etc. — hands off
  if (url.pathname.startsWith('/api/')) return; // never cache API/auth traffic

  // Immutable build assets & brand files: cache-first, refill in background
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/brand/')
  ) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  // Page navigations: always try the network; offline page as the net
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline')));
  }
});

// Web Push: new study material for the student's course audience.
// Payload: { title, body, url, icon } as JSON (see src/lib/push.ts).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Azhimathi Mayam';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'Something new was added for your semester.',
      icon: data.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/dashboard/notifications' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target =
    (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        for (const client of windows) {
          if ('focus' in client) {
            if ('navigate' in client) client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
