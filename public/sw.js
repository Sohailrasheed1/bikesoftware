const CACHE_NAME = "gilani-autos-pwa-v1";

const STATIC_ASSETS = [
  "/",
  "/login",
  "/billing",
  "/bills",
  "/customers",
  "/inventory",
  "/mechanics",
  "/reports",
  "/suppliers",
  "/workshop",
  "/manifest.json",
  "/icon.svg"
];

// Install Event - Pre-cache essential static assets
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching offline app shell");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[Service Worker] Cache addAll warning:", err);
      });
    })
  );
});

// Activate Event - Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Handle offline requests with Network-First / Cache Fallback strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and API auth routes
  if (request.method !== "GET" || url.pathname.startsWith("/api/auth")) {
    return;
  }

  // Handle page navigations & static assets
  event.respondWith(
    fetch(request)
      .then((response) => {
        // If network response is valid, clone & cache it
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        // If network fails (Offline mode), try match from Cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Fallback for HTML page navigation if specific page not in cache
        if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
          const mainCache = await caches.open(CACHE_NAME);
          const cachedHome = await mainCache.match("/") || await mainCache.match("/login");
          if (cachedHome) {
            return cachedHome;
          }
        }

        return new Response("Offline - Gilani Autos Software", {
          status: 503,
          statusText: "Service Unavailable",
          headers: new Headers({ "Content-Type": "text/plain" }),
        });
      })
  );
});
