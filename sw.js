/* M57 FCS — Service Worker v1.1 — Full Offline Cache */
const CACHE_NAME = 'm57-fcs-v2';
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

/* Fetch: pages network-first (so updates arrive), assets cache-first, cross-origin untouched */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; /* weather / IP lookups always go to the network */

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put('./index.html', copy));
        return resp;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      if (resp && resp.status === 200) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
      }
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
