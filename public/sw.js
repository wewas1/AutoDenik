const VERSION = 'v2';
const CACHE = 'autodenik-' + VERSION;

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
  // Notify all clients about update
  self.clients.matchAll().then(clients =>
    clients.forEach(client => client.postMessage({type: 'UPDATE_AVAILABLE', version: VERSION}))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
