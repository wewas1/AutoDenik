// Service Worker - AutoDeník
const CACHE_NAME = 'autodenik-v3';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Zachyť share target POST request
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Zachyť odpověď z /api/share-target a předej receipt do PWA
  if (url.pathname === '/api/share-target' && e.request.method === 'POST') {
    e.respondWith(
      fetch(e.request).then(async response => {
        // Přečti text odpovědi
        const text = await response.text();
        // Najdi receipt v HTML nebo redirect URL
        const match = text.match(/receipt[=']([a-z0-9]+\.(pdf|jpg))/i);
        if (match) {
          const receipt = match[1];
          // Pošli receipt všem otevřeným oknům PWA
          const clients = await self.clients.matchAll({ type: 'window' });
          if (clients.length > 0) {
            clients.forEach(client => client.postMessage({ type: 'RECEIPT', receipt }));
          } else {
            // Žádné okno není otevřené - ulož do IDB
            // Použijeme jednoduchý workaround přes URL
          }
        }
        // Vrať redirect na hlavní stránku
        return Response.redirect('/?sw=1', 302);
      }).catch(() => Response.redirect('/', 302))
    );
    return;
  }

  // Pro navigaci vždy fetch ze sítě
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Pro ostatní assets - network first
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
