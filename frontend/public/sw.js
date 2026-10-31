// Aarogya Drishti - Offline Service Worker (PWA)
// Enables field health workers to launch the app and perform patient registrations and oral screenings completely offline.

const CACHE_NAME = 'aarogya-drishti-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/favicon.svg',
  '/assets/logo-192.png',
  '/assets/logo-512.png',
  '/assets/aarogya_drishti_logo.png',
  '/assets/dashboard_hero_banner.jpg',
  '/assets/sidebar_village.png'
];

// Install event - Cache core static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-caching some static assets failed:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - Cleanup obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first for APIs, Cache first for app assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // AI & Auth APIs should not be cached in SW (AI works online)
  if (url.pathname.startsWith('/api/v1/chat') || url.pathname.startsWith('/api/v1/mytra-ai')) {
    return;
  }

  // API calls: Network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Return 503 so client-side offlineStorage handles fallback gracefully
        return new Response(JSON.stringify({ error: 'offline', message: 'You are offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // App shell / static files: Cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.method === 'GET' &&
          (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.svg'))
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
