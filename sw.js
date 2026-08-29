// Simple offline cache. Bump the version string to force a refresh of cached
// files after you change the app.
const CACHE = 'kharcha-v1';

const APP_SHELL = [
  './',
  './index.html',
  './app.jsx',
  './config.js',
  './lib/firebase.js',
  './lib/storage.js',
  './lib/auth.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './icons/icon-maskable-512.png',
  'https://unpkg.com/@babel/standalone@7.25.6/babel.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(APP_SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Let the live Firebase *data* and *auth* APIs go straight to the network.
  // Firestore keeps its own offline copy in the browser, so we must not get in
  // its way. (The Firebase SDK code itself, from gstatic, is still cached below.)
  if (/\.(googleapis|firebaseio)\.com$/.test(url.hostname) ||
      url.hostname === 'securetoken.google.com') {
    return;
  }

  // Everything else (app files + the CDN libraries): serve from cache first,
  // and quietly refresh the cache in the background.
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request);
      const network = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && url.protocol === 'https:') {
            cache.put(e.request, res.clone());
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
