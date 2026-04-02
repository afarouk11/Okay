// Synaptiq Service Worker — offline support for flashcards & core app
const CACHE = 'synaptiq-v14';
const CORE_ASSETS = [
  '/',
  '/index.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Only handle same-origin GET requests
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Cache-first for the main app shell
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => null);

      // Serve from cache immediately and refresh in the background.
      if (cached) return cached;

      // No cache hit — wait for the network response.
      return networkFetch.then(networkResp => {
        if (networkResp) return networkResp;
        // Network failed: for navigation requests only, serve the cached app
        // shell so the page loads offline. For JS/CSS/font requests return a
        // 503 so the browser surfaces a proper error instead of HTML-as-script.
        if (e.request.mode === 'navigate') return caches.match('/index.html');
        return new Response('Service Unavailable', { status: 503 });
      });
    })
  );
});

// Notify clients when going offline/online
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
