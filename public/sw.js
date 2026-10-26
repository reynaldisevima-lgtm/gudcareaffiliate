// Service worker Gudcare Survey.
// - Halaman (dashboard, form, lacak) selalu diambil dari jaringan: isinya data pribadi dan harus terbaru,
//   jadi tidak pernah disimpan di cache. Saat offline tampil /offline.html.
// - Aset statis ber-hash dari build (/_next/static) dan ikon disimpan cache-first agar app cepat dibuka.
//   Di mode dev (?dev=1) aset /_next tidak di-cache supaya hot reload tidak tertahan file lama.
const VERSION = 'v3';
const CACHE = `gudcare-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const DEV = new URL(self.location.href).searchParams.has('dev');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL, '/icons/icon-192.png'])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gudcare-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  const cacheable = url.pathname.startsWith('/icons/') || (!DEV && url.pathname.startsWith('/_next/static/'));
  if (!cacheable) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
  );
});
