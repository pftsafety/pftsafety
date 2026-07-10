// PFT Safety Portal — service worker
// Scope: /pftsafety/

const CACHE_VERSION = 'pft-portal-v4';
const CORE_ASSETS = [
  '/pftsafety/',
  '/pftsafety/index.html',
  '/pftsafety/config.js',
  '/pftsafety/auth-guard.js',
  '/pftsafety/manifest.json',
  '/pftsafety/icon-192.png',
  '/pftsafety/icon-512.png',
  '/pftsafety/change-pin.html',
  '/pftsafety/signup.html',
  '/pftsafety/admin.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(c => c.addAll(CORE_ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname.includes('script.google.com')) return;
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
