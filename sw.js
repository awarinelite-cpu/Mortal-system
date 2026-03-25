/* M57 FCS — Service Worker v1.1 — Full Offline Cache */
const CACHE_NAME = 'm57-fcs-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

/* Install: pre-cache core assets (skip missing icons gracefully) */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      /* Cache index.html and manifest.json — icons are optional */
      return cache.addAll(['./index.html', './manifest.json'])
        .then(() => {
          /* Try to cache icons but don't fail if they're missing */
          return Promise.allSettled(
            ['./icon-192.png', './icon-512.png'].map(url =>
              cache.add(url).catch(() => {})
            )
          );
        });
    }).then(() => self.skipWaiting())
  );
});

/* Activate: clean up old caches */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* Fetch: cache-first strategy — fully offline */
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
