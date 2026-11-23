/* Offline support: network first (so updates show up), cache as fallback. */
const CACHE = 'tg2026-v4';
const SHELL = [
  '/thanksgiving/', '/thanksgiving/style.css', '/thanksgiving/data.js', '/thanksgiving/app.js',
  '/thanksgiving/manifest.json', '/thanksgiving/icon.svg', '/thanksgiving/icon-180.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const ours = url.origin === self.location.origin && url.pathname.startsWith('/thanksgiving/');
  if (!ours && !font) return;

  if (font) {
    // Fonts rarely change: cache first.
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    })));
    return;
  }

  const key = req.mode === 'navigate' ? '/thanksgiving/' : req;
  const network = fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
    return res;
  });
  // Wait up to 3 s for the network (spotty store signal), then use the cached copy.
  e.respondWith(Promise.race([network, timeout(3000)]).catch(() =>
    caches.match(key, { ignoreSearch: true }).then(hit => hit || network)));
});
