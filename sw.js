// ═══ Veyra Studio — service worker ═══
// Rôles : recevoir les notifications « C'est l'heure de poster »,
// ouvrir le bon post au toucher, et garder l'app lisible hors connexion.

const CACHE = 'veyra-v2-1';
const SHELL = ['/', '/css/app.css', '/js/app.js', '/js/store.js', '/js/ui.js', '/js/config.js',
  '/js/views/today.js', '/js/views/platform.js', '/js/views/editor.js', '/js/views/poster.js',
  '/js/views/stats.js', '/js/views/settings.js', '/js/views/common.js', '/icon-192.png', '/favicon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Réseau d'abord (toujours la dernière version), cache en secours hors ligne.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('/')))
  );
});

self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data.json(); } catch { data = { title: 'Veyra Studio', body: e.data?.text() || '' }; }
  e.waitUntil(self.registration.showNotification(data.title || 'C’est l’heure de poster ✨', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/favicon-32x32.png',
    tag: data.tag,
    renotify: true,
    requireInteraction: true,
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const win = wins.find((w) => w.url.startsWith(self.location.origin));
    if (win) { await win.focus(); win.postMessage({ type: 'open-post', url }); return; }
    await self.clients.openWindow(url);
  })());
});
