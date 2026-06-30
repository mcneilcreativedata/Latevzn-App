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

const CACHE_NAME = 'latevzn-shell-v5';

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
  './js/db.js',
  './vendor/dexie.min.js',
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

// ---- Activate: clean up old versions and take control -------------------
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1. Remove caches left over from older versions.
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name !== CACHE_NAME)
        .map((name) => caches.delete(name))
    );

    // 2. Take control of any pages that are already open right away (instead
    //    of waiting for them to be closed and reopened). Combined with
    //    skipWaiting() on install, this means the new worker becomes the
    //    active one as soon as it is installed, so the next time the app is
    //    opened it already runs this version — no need to reinstall.
    await self.clients.claim();
  })());
});

// ---- Fetch: serve files from the cache, falling back to the network -----
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle simple page/file GET requests.
  if (request.method !== 'GET') {
    return;
  }

  // For page navigations, serve the saved page from the cache FIRST so the app
  // opens with no network attempt at all when offline. (Hitting the network
  // first here is what made iOS show the "Use Wi-Fi" popup in airplane mode.)
  // The network is only used as a last resort if the page somehow isn't cached.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request)
        .then((cached) => cached || caches.match('./index.html'))
        .then((cached) => cached || fetch(request))
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
