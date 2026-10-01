"use client";

import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const { isUrdu } = useLanguage();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === "accepted") {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (!isInstallable) return null;

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold transition shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer animate-pulse"
      title={isUrdu ? "ایپ موبائل / لیپ ٹاپ پر انسٹال کریں" : "Install App on Mobile / PC"}
    >
      <Download className="h-3.5 w-3.5" />
      <span>{isUrdu ? "ایپ انسٹال کریں" : "Install App"}</span>
    </button>
  );
}
