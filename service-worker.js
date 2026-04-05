const CACHE_NAME = 'netubex-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/pets.html',
  '/pgc.html',
  '/pilote.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
