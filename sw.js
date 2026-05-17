/**
 * sw.js — Service Worker for Neon Snake PWA
 * Caches all core assets for offline play
 */

const CACHE_NAME = "neon-snake-v1.0";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./game.js",
  "./firebase.js",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap"
];

// Install — cache all assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS.filter(a => !a.startsWith("http") || a.includes("fonts"))))
      .catch(err => console.warn("[SW] Cache failed:", err))
  );
  self.skipWaiting();
});

// Activate — remove old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for assets, network-first for Firebase
self.addEventListener("fetch", event => {
  const url = event.request.url;

  // Let Firebase requests pass through to network
  if (url.includes("firebaseapp.com") ||
      url.includes("googleapis.com/firestore") ||
      url.includes("gstatic.com/firebasejs")) {
    return; // default fetch
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses
        if (response && response.status === 200 && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback for navigation
      if (event.request.mode === "navigate") {
        return caches.match("./index.html");
      }
    })
  );
});
