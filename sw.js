const CACHE_NAME = 'loveconnect-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/globals.css',
  '/scripts/app.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/favicon.ico',
  '/sounds/notification.mp3',
  '/sounds/kiss.mp3',
  '/sounds/hug.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return (
        response ||
        fetch(event.request).catch(() => {
          // If offline and not in cache, fallback to index.html for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        })
      );
    })
  );
});