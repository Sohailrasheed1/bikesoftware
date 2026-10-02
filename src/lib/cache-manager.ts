/**
 * Application Cache & Version Management Utility
 * Provides one-click cache clearing, Service Worker updates, and hard reloads
 */

export const APP_CACHE_VERSION_KEY = "jilani_autos_client_version";
export const APP_BUILD_TIME_KEY = "jilani_autos_client_build_time";
export const APP_BUILD_ID_KEY = "jilani_autos_client_build_id";

export interface VersionInfo {
  version: string;
  buildId?: string;
  buildTime: string;
  timestamp: number;
}

/**
 * Check if the server has deployed a newer version than what client is running
 */
export async function fetchServerVersion(): Promise<VersionInfo | null> {
  try {
    const res = await fetch(`/api/app-version?_ts=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("[CacheManager] Failed to fetch server version:", err);
    return null;
  }
}

/**
 * Completely purges all client caches, service workers, and forces a clean reload from the live server.
 * Preserves user credentials / auth tokens so user doesn't have to re-enter shop configuration.
 */
export async function clearAppCacheAndReload(): Promise<void> {
  try {
    console.log("[CacheManager] Starting complete cache and service worker purge...");

    // 1. Unregister all active Service Workers
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          // Tell SW to skip waiting and clear internal caches if possible
          if (registration.active) {
            registration.active.postMessage({ type: "CLEAR_ALL_CACHES" });
          }
          await registration.unregister();
          console.log("[CacheManager] Unregistered SW registration:", registration.scope);
        }
      } catch (swErr) {
        console.warn("[CacheManager] Error unregistering service workers:", swErr);
      }
    }

    // 2. Clear all browser CacheStorage instances (PWA assets, pages, chunks)
    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const cacheKeys = await window.caches.keys();
        await Promise.all(
          cacheKeys.map(async (key) => {
            console.log("[CacheManager] Deleting cache:", key);
            return window.caches.delete(key);
          })
        );
      } catch (cacheErr) {
        console.warn("[CacheManager] Error clearing cache storage:", cacheErr);
      }
    }

    // 3. Clear temporary session and version storage
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.clear();
        window.localStorage.removeItem(APP_CACHE_VERSION_KEY);
        window.localStorage.removeItem(APP_BUILD_TIME_KEY);
        window.localStorage.removeItem(APP_BUILD_ID_KEY);
      } catch (storageErr) {
        console.warn("[CacheManager] Error clearing storage:", storageErr);
      }

      // 4. Force hard navigation bypassing HTTP cache
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("_v", Date.now().toString());
      window.location.href = currentUrl.toString();
    }
  } catch (err) {
    console.error("[CacheManager] Unexpected error during cache clear:", err);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }
}
