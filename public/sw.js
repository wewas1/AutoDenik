const CACHE_NAME = 'autodenik-v4';

// Jednoduchá IDB helper
function idbSet(key, value) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('autodenik-sw', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('kv');
    req.onsuccess = e => {
      const tx = e.target.result.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = reject;
    };
    req.onerror = reject;
  });
}

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (url.pathname === '/api/share-target' && e.request.method === 'POST') {
    e.respondWith(
      fetch(e.request.clone()).then(async response => {
        const text = await response.clone().text();
        const match = text.match(/receipt[='"]([a-z0-9]+\.(pdf|jpg))/i);
        if (match) {
          await idbSet('pending_receipt', match[1]);
          // Pošli zprávu všem klientům
          const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
          clients.forEach(c => c.postMessage({ type: 'RECEIPT', receipt: match[1] }));
        }
        return Response.redirect('/', 302);
      }).catch(() => Response.redirect('/', 302))
    );
    return;
  }

  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
