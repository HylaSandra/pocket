const CACHE_NAME = 'pocket-v1';
const FILES = [
  'index.html',
  'expenses.html',
  'income.html',
  'budget.html',
  'style.css',
  'app.js',
  'favicon.ico' // optional, to avoid 404 if you have a favicon
];

self.addEventListener('install', evt => {
  evt.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache each file, but don't fail install on error
    await Promise.all(FILES.map(async file => {
      try {
        await cache.add(file);
      } catch (err) {
        console.warn(`Failed to cache ${file}:`, err);
      }
    }));
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
  // Bypass cache for API requests
  if (evt.request.url.includes('/api/')) {
    return evt.respondWith(fetch(evt.request));
  }
  // For navigation to root, serve index.html
  if (evt.request.mode === 'navigate') {
    return evt.respondWith(
      caches.match('index.html').then(resp => resp || fetch(evt.request))
    );
  }
  // Otherwise serve from cache, fall back to network
  evt.respondWith(
    caches.match(evt.request).then(resp => resp || fetch(evt.request))
  );
});
