/**
 * Aarogya Drishti — PWA Service Worker
 * Secure Static Asset Caching for Low-Cost Android, Tablets, & Desktop.
 *
 * CRITICAL PRIVACY & SECURITY POLICY:
 * - ONLY caches static application shell assets (HTML, CSS, JS, SVG icons).
 * - NEVER caches sensitive patient data, uploaded medical images, or API endpoints.
 * - All /api/ and /storage/ requests bypass cache completely.
 */

const STATIC_CACHE_NAME = 'aarogya-static-v1.1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/favicon.svg'
];

// Install: Cache critical static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Purge obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Safe Cache Strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. STRICT PRIVACY GUARD: Never intercept or cache API or medical storage routes
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/storage/') ||
    url.pathname.includes('/images/') ||
    event.request.method !== 'GET'
  ) {
    // Network-only without service worker caching
    return;
  }

  // 2. Static Assets: Network-first with Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache valid static responses
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          (url.pathname.endsWith('.js') ||
           url.pathname.endsWith('.css') ||
           url.pathname.endsWith('.svg') ||
           url.pathname.endsWith('.woff2') ||
           url.pathname === '/' ||
           url.pathname === '/index.html')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline Fallback for Static Shell
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});
