// ============================================================================
// Latevzn — service worker
// ----------------------------------------------------------------------------
// A service worker is a small script the browser keeps running in the
// background. Its job here is to save ("cache") the app's files so the app
// can open even with no internet connection.
//
// When you change the app's files later, bump the version number below
// (e.g. "v1" -> "v2"). That tells phones to refresh their saved copy.
// ============================================================================

const CACHE_NAME = 'latevzn-shell-v1';

// The files that make up the app shell. These are saved when the app is
// first opened so it can run offline afterwards.
// Paths are relative so this works on GitHub Pages sub-folders.
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/router.js',
  './js/data.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

// ---- Install: save the shell files --------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  // Activate this new version right away.
  self.skipWaiting();
});

// ---- Activate: clean up old saved versions ------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  // Start controlling open pages immediately.
  self.clients.claim();
});

// ---- Fetch: serve files from the cache, falling back to the network -----
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle simple page/file GET requests.
  if (request.method !== 'GET') {
    return;
  }

  // For page navigations, try the network first, then fall back to the
  // saved home page so the app always opens (even offline).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // For everything else: use the saved copy if we have it, otherwise
  // fetch from the network and save a copy for next time.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        // Only cache valid, same-origin responses.
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
