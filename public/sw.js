// Jilani Autos Production Service Worker
// Automatically versioned via registration URL parameter (?v=BUILD_ID)

const swUrl = new URL(self.location.href);
const VERSION = swUrl.searchParams.get("v") || "v4.0.0";
const CACHE_NAME = `jilani-autos-${VERSION}`;

const PRECACHE_ASSETS = [
  "/offline.html",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon-32.png",
  "/favicon-64.png",
];

// 1. Install Event: Pre-cache core shell assets and skip waiting immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching shell assets for version:", VERSION);
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[Service Worker] Pre-cache warning:", err);
      });
    })
  );
});

// 2. Activate Event: Instantly delete ALL outdated caches from previous deployments
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log("[Service Worker] Auto-purging outdated cache:", key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Message Listener for manual or programmatic cache management
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "CLEAR_ALL_CACHES") {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => {
          return Promise.all(keys.map((k) => caches.delete(k)));
        })
        .then(() => {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ success: true });
          }
        })
    );
  }
});

// 4. Fetch Event: Production Caching Strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests, API endpoints, and dynamic auth routes
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/")
  ) {
    return;
  }

  // A. HTML Page Navigations: Strict Network-First with Offline Fallback
  // Guarantees users always see the latest deployed HTML and translations when online
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;

          const cache = await caches.open(CACHE_NAME);
          const cachedOffline = await cache.match("/offline.html");
          if (cachedOffline) return cachedOffline;

          return new Response("Offline - Jilani Autos", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({ "Content-Type": "text/plain" }),
          });
        })
    );
    return;
  }

  // B. Next.js Immutable Content-Hashed Chunks (_next/static/*): Cache-First
  // Filenames have hashes (e.g. app-8f92b.js); cache-first is 100% safe and fast
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // C. Public Static Assets (logos, icons, svgs, images, fonts, manifest.json):
  // NETWORK-FIRST with fast offline cache fallback!
  // When online, this ALWAYS fetches the freshest logo/icon/manifest from the server.
  // If the server updated the asset, the user sees it immediately without clearing cache.
  const isStaticPublicAsset =
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf|json)$/) ||
    url.pathname === "/manifest.json";

  if (isStaticPublicAsset) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline or network error, serve from cache
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return new Response("", { status: 404, statusText: "Asset Not Found" });
          });
        })
    );
    return;
  }

  // D. Default fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
