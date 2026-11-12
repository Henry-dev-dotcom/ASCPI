// Service worker: makes the app (and the installed app) work offline.
// Strategy: network first so updates show up, but give up after a few seconds on a
// weak connection and use the saved copy. With no network at all, the saved copy is used.
const CACHE = 'ascpi-v2';
const APP = './ASCPi%20MLS%20Study%20App.html';
const CORE = [
  './',
  './index.html',
  APP,
  './ASCPi%20MLS%20Practice%20Quiz.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];
const TIMEOUT_MS = 4000;

self.addEventListener('install', e => {
  // cache: 'reload' skips the browser's HTTP cache so the saved copy is the latest one
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromCache(req) {
  return caches.match(req, { ignoreSearch: true })
    .then(r => r || (req.mode === 'navigate' ? caches.match(APP) : undefined));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  const network = fetch(req).then(res => {
    if (res.status === 200 && res.type === 'basic') {
      const copy = res.clone();
      e.waitUntil(caches.open(CACHE).then(c => c.put(req, copy)));
    }
    return res;
  });
  network.catch(() => {}); // avoid unhandled rejection when the timeout wins

  const timeout = new Promise(resolve => setTimeout(resolve, TIMEOUT_MS)).then(() => fromCache(req));

  e.respondWith(
    Promise.race([network, timeout])
      .then(res => res || network)            // timeout fired but nothing cached: keep waiting
      .catch(() => fromCache(req))            // offline: use the saved copy
      .then(res => res || new Response('Offline and not saved yet.', { status: 503, headers: { 'Content-Type': 'text/plain' } }))
  );
});
