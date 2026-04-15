// Synaptiq Service Worker — offline support for flashcards & core app
const CACHE = 'synaptiq-v16';

const CORE_ASSETS = [
  '/',
  '/lessons',
  '/jarvis',
  '/pricing',
  '/contact',
  '/og-image.svg',
  '/favicon.svg',
];

// ── IndexedDB helpers for offline /api/progress queue ────────────────────────
const IDB_NAME  = 'synaptiq-sw';
const IDB_STORE = 'progress-queue';

function _openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(IDB_STORE, { autoIncrement: true });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function _idbAdd(item) {
  const db = await _openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).add(item);
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

async function _idbGetAll() {
  const db = await _openIDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function _idbClear() {
  const db = await _openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

// ── Install: precache core assets ─────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Background sync: retry queued /api/progress POSTs ────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'sync-progress') {
    e.waitUntil(
      _idbGetAll().then(async items => {
        if (!items.length) return;
        const results = await Promise.allSettled(
          items.map(({ body, authHeader }) =>
            fetch('/api/progress', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(authHeader ? { Authorization: authHeader } : {}),
              },
              body,
            })
          )
        );
        // Only wipe the queue when every retry succeeds
        if (results.every(r => r.status === 'fulfilled' && r.value.ok)) {
          await _idbClear();
        }
      }).catch(err => console.warn('[SW sync]', err))
    );
  }
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Queue offline POST /api/progress for background sync
  if (e.request.method === 'POST' && url.pathname === '/api/progress') {
    e.respondWith(
      (async () => {
        const reqClone = e.request.clone();
        try {
          return await fetch(e.request);
        } catch {
          try {
            const body       = await reqClone.text();
            const authHeader = reqClone.headers.get('Authorization') || '';
            await _idbAdd({ body, authHeader, timestamp: Date.now() });
            if (self.registration.sync) {
              await self.registration.sync.register('sync-progress');
            }
          } catch (err) {
            console.warn('[SW] Queue failed:', err);
          }
          return new Response(JSON.stringify({ queued: true }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })()
    );
    return;
  }

  // Only cache GET requests from here on
  if (e.request.method !== 'GET') return;

  // Cache Google Fonts cross-origin (cache-first, opaque responses accepted)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(CACHE).then(c => c.match(e.request)).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (resp.ok || resp.type === 'opaque') {
            caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
          }
          return resp;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // Only handle same-origin requests from here on
  if (url.origin !== self.location.origin) return;

  // Network-first for API calls; cache successful responses for offline fallback.
  // Auth errors (401/403) are not cached so stale credentials are never served.
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      (async () => {
        try {
          const resp = await fetch(e.request.clone());
          if (resp.ok) {
            caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
          }
          return resp;
        } catch {
          const cached = await caches.match(e.request);
          if (cached) return cached;
          return new Response(JSON.stringify({ error: 'offline' }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })()
    );
    return;
  }

  // Stale-while-revalidate for HTML / JS / CSS / assets
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
        if (e.request.mode === 'navigate') return caches.match('/');
        return new Response('Service Unavailable', { status: 503 });
      });
    })
  );
});

// Notify clients when going offline/online
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
