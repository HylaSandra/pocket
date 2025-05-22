const CACHE_NAME = 'pocket-v1';
const FILES = [
  '/',
  '/index.html',
  '/expenses.html',
  '/income.html',
  '/budget.html',
  '/style.css',
  '/app.js'
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
  );
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
    evt.respondWith(fetch(evt.request));
    return;
  }
  // Otherwise serve from cache, fall back to network
  evt.respondWith(
    caches.match(evt.request).then(resp => resp || fetch(evt.request))
  );
});
