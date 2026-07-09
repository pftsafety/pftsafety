// PFT Safety Portal — service worker v3
// Scope: /Portal/ (set by manifest.json)

const CACHE_VERSION = 'pft-portal-v3';
const CORE_ASSETS = [
  '/Portal/',
  '/Portal/index.html',
  '/Portal/config.js',
  '/Portal/manifest.json',
  '/Portal/icon-192.png',
  '/Portal/icon-512.png',
  '/Portal/change-pin.html',
  '/Portal/signup.html',
  '/Portal/admin.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Never cache Apps Script API calls — always hit the network
  if (url.hostname.includes('script.google.com')) return;
  // Only handle same-origin requests
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
