"use client";

import React, { useEffect, useState, useCallback, useRef, useContext } from "react";
import { Sparkles, RefreshCw, X } from "lucide-react";
import {
  clearAppCacheAndReload,
  fetchServerVersion,
  APP_BUILD_TIME_KEY,
  APP_CACHE_VERSION_KEY,
  APP_BUILD_ID_KEY,
} from "@/lib/cache-manager";
import { BUILD_ID, APP_VERSION } from "@/lib/version";
import { LanguageContext } from "@/lib/i18n/context";

export function ServiceWorkerRegister() {
  const langContext = useContext(LanguageContext);
  const isUrdu = langContext ? langContext.isUrdu : true;
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  // Check version against server
  const checkServerVersion = useCallback(async () => {
    try {
      const serverInfo = await fetchServerVersion();
      if (!serverInfo) return;

      const storedBuildId = localStorage.getItem(APP_BUILD_ID_KEY);

      if (!storedBuildId) {
        // First visit or fresh load with new build
        localStorage.setItem(APP_BUILD_ID_KEY, serverInfo.buildId || BUILD_ID);
        localStorage.setItem(APP_BUILD_TIME_KEY, serverInfo.buildTime);
        localStorage.setItem(APP_CACHE_VERSION_KEY, serverInfo.version);
        return;
      }

      // If build ID on server is newer than what client is running, prompt update
      if (serverInfo.buildId && serverInfo.buildId !== storedBuildId) {
        console.log("[ServiceWorkerRegister] New build detected on server:", serverInfo.buildId);
        setHasUpdate(true);
      }
    } catch (err) {
      console.warn("[ServiceWorkerRegister] Version check error:", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    const setupServiceWorker = async () => {
      try {
        // Automatically sync stored build ID on mount
        localStorage.setItem(APP_BUILD_ID_KEY, BUILD_ID);

        // updateViaCache: 'none' forces browser to re-check sw.js on every navigation
        // Passing ?v=${BUILD_ID} ensures immediate cache-busting of the service worker script
        registration = await navigator.serviceWorker.register(`/sw.js?v=${BUILD_ID}`, {
          updateViaCache: "none",
        });

        console.log("[PWA] Service Worker registered with scope:", registration.scope);

        // Check if there is already a waiting worker
        if (registration.waiting) {
          waitingWorkerRef.current = registration.waiting;
          setHasUpdate(true);
        }

        // Listen for new worker updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration?.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              console.log("[PWA] New version ready & waiting to activate");
              waitingWorkerRef.current = newWorker;
              setHasUpdate(true);
            }
          });
        });

        // Trigger an update check immediately on load
        registration.update().catch(() => {});
      } catch (err) {
        console.warn("[PWA] Service Worker registration failed:", err);
      }
    };

    window.addEventListener("load", setupServiceWorker);

    // Initial check server version
    checkServerVersion();

    // Check on window focus and visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        registration?.update().catch(() => {});
        checkServerVersion();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    // Periodic check every 5 minutes
    const interval = setInterval(() => {
      registration?.update().catch(() => {});
      checkServerVersion();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener("load", setupServiceWorker);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [checkServerVersion]);

  // Handle user clicking "Update Now"
  const handleApplyUpdate = async () => {
    try {
      setIsUpdating(true);

      // If waiting worker exists, tell it to take over
      if (waitingWorkerRef.current) {
        waitingWorkerRef.current.postMessage({ type: "SKIP_WAITING" });
      }

      // Purge client caches and hard reload fresh from server
      await clearAppCacheAndReload();
    } catch (err) {
      console.error("[PWA] Update error:", err);
      window.location.reload();
    }
  };

  if (!hasUpdate || isDismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md p-4 animate-in slide-in-from-bottom-5 duration-300 flex items-start gap-3.5"
    >
      <div className="h-10 w-10 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-500/30 mt-0.5">
        <Sparkles className="h-5 w-5 text-blue-400 animate-pulse" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-white tracking-tight">
            {isUrdu ? "نیا ورژن دستیاب ہے!" : "New Version Available!"}
          </h4>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          {isUrdu
            ? "سافٹ ویئر کی نئی تبدیلیاں اور فیچرز لائیو ہو چکے ہیں۔ ابھی اپڈیٹ کریں تاکہ تمام تبدیلیاں فوری ظاہر ہوں۔"
            : "A new version of the software is live. Click update to load the latest features immediately."}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={isUpdating}
            onClick={handleApplyUpdate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isUpdating ? "animate-spin" : ""}`} />
            <span>
              {isUpdating
                ? isUrdu
                  ? "اپڈیٹ ہو رہا ہے..."
                  : "Updating..."
                : isUrdu
                ? "ابھی اپڈیٹ کریں"
                : "Update Now"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition"
          >
            {isUrdu ? "بعد میں" : "Later"}
          </button>
        </div>
      </div>
    </div>
  );
}
