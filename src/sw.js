// Service worker: app shell is precached so repeat visits open instantly and work offline.
// Same-origin GETs are served cache-first and refreshed in the background (stale-while-revalidate);
// a new deploy changes VERSION, which installs a fresh cache and drops the old one.
const VERSION = '__VERSION__';
const CACHE = 'plumbing-' + VERSION;
const SHELL = ['__SHELL__'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('plumbing-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
