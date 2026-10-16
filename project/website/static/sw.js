// Itihaas service worker — served at /sw.js so its scope is the whole site.
//
// Pages always come from the network (they depend on the logged-in user and
// change often); if the network is down the user gets a small offline page
// instead of the browser's error. Static assets (images, CSS, icons) use
// stale-while-revalidate so repeat visits and the installed app load fast.
// Videos and API calls are left to the network.

const VERSION = 'itihaas-v1';
const OFFLINE_URL = '/static/offline.html';
const PRECACHE = [
  OFFLINE_URL,
  '/static/css/mobile.css',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  const cacheable =
    url.origin === self.location.origin &&
    url.pathname.startsWith('/static/') &&
    !/\.(mp4|mp3|webm)$/i.test(url.pathname);
  if (!cacheable) return;

  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
