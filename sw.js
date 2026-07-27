// PFT Safety Portal — service worker
// Scope: /pftsafety/

const CACHE_VERSION = 'pft-portal-v5';
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

// ---- Push notifications (Firebase Cloud Messaging) ----
// Reusing this same service worker for messaging (rather than a second,
// separately-registered firebase-messaging-sw.js) avoids any scope
// conflict between two service workers on the same origin.
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAmWZAYQWL-6Yqhua59aJUkjs_vXBPttRI',
  authDomain: 'pftportal-59903.firebaseapp.com',
  projectId: 'pftportal-59903',
  storageBucket: 'pftportal-59903.firebasestorage.app',
  messagingSenderId: '305683563237',
  appId: '1:305683563237:web:c6b474bacabfdd7c260a0c'
});

const messaging = firebase.messaging();

// Fires when a push arrives while the app is closed or in the background.
// (Foreground messages while the app is open are handled directly in
// index.html instead, via onMessage.)
messaging.onBackgroundMessage(payload => {
  const title = (payload.notification && payload.notification.title) || 'PFT Safety Portal';
  const body = (payload.notification && payload.notification.body) || '';
  self.registration.showNotification(title, {
    body: body,
    icon: '/pftsafety/icon-192.png',
    badge: '/pftsafety/icon-192.png'
  });
});

// Tapping the notification focuses/opens the Portal.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('/pftsafety/') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/pftsafety/index.html');
    })
  );
});

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
