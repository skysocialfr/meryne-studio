// Service worker — minimal "shell" SW so the PWA install prompt becomes
// available. We deliberately keep network-first behaviour so that the
// existing auto-update mechanism (version.json bump) keeps working: we
// never serve a stale index.html / js / css from the SW cache. Static
// asset caching is left to the browser's HTTP cache, which we control via
// query-string versions (?v=N).

const SW_VERSION = 'veyra-sw-v1';

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== SW_VERSION; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Pass-through fetch — let the browser do its thing. Future-proofs the
// SW (offline support can be added later without breaking the
// auto-update flow).
self.addEventListener('fetch', function (event) {
  // No interception; default network behaviour applies.
});
