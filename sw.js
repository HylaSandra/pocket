const CACHE_NAME = 'pocket-v1';
const FILES = [
  'index.html',
  'expenses.html',
  'income.html',
  'budget.html',
  'style.css',
  'app.js'
  'manifest.json'
];

self.addEventListener('install', evt => {
  evt.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(
      FILES.map(async file => {
        try {
          await cache.add(file);
        } catch (err) {
          console.warn(`Failed to cache ${file}:`, err);
        }
      })
    );
  })());
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', evt => {
  if (evt.request.url.includes('/api/')) {
    evt.respondWith(fetch(evt.request));
    return;
  }

  evt.respondWith(
    caches.match(evt.request).then(resp => resp || fetch(evt.request))
  );
});
