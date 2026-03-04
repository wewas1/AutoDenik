const CACHE_NAME = 'autodenik-v5';

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
    e.respondWith((async () => {
      try {
        const response = await fetch(e.request.clone());
        const text = await response.clone().text();
        const match = text.match(/['"]([a-z0-9]+\.(pdf|jpg))['"]/i);
        if (match) {
          const receipt = match[1];
          // Broadcast do všech klientů
          const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
          for (const client of clients) {
            client.postMessage({ type: 'RECEIPT', receipt });
          }
          // Ulož do IDB jako záloha
          try {
            const db = await new Promise((res, rej) => {
              const r = indexedDB.open('ad', 1);
              r.onupgradeneeded = e => e.target.result.createObjectStore('kv');
              r.onsuccess = e => res(e.target.result);
              r.onerror = rej;
            });
            await new Promise((res, rej) => {
              const tx = db.transaction('kv', 'readwrite');
              tx.objectStore('kv').put(receipt, 'receipt');
              tx.oncomplete = res;
              tx.onerror = rej;
            });
          } catch(e) {}
        }
        return Response.redirect('/', 302);
      } catch(e) {
        return Response.redirect('/', 302);
      }
    })());
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
