"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  LogOut,
  ShieldCheck,
  Shield,
  Clock,
  RotateCcw,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { PWAInstallButton } from "@/components/ui/pwa-install-button";
import { useLanguage } from "@/lib/i18n/context";
import { useSession, signOut } from "next-auth/react";
import { useStore } from "@/lib/storage/context";
import { clearAppCacheAndReload } from "@/lib/cache-manager";
import { getAssetUrl } from "@/lib/version";

export function Navbar() {
  const pathname = usePathname();
  const { t, isUrdu } = useLanguage();
  const { data: session } = useSession();
  const { isOnline, pendingSyncCount, triggerManualSync, resetToSampleData } = useStore();
  const isHome = pathname === "/";
  const [time, setTime] = useState<string>("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showCacheModal, setShowCacheModal] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const userRole = (session?.user as any)?.role;
  const isSuperAdmin = userRole === "superadmin";
  const shopDisplayName = (session?.user as any)?.shopName || "Jilani Autos";

  // Handle outside click to close profile dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        new Intl.DateTimeFormat(isUrdu ? "ur-PK" : "en-PK", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(now)
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isUrdu]);

  const handleResetData = async () => {
    try {
      setIsResetting(true);
      await resetToSampleData();
      setShowResetModal(false);
      window.location.reload();
    } catch (err) {
      console.error("Reset data error:", err);
      alert(isUrdu ? "ڈیٹا ریسیٹ کرنے میں خرابی پیش آئی" : "Failed to reset data");
    } finally {
      setIsResetting(false);
    }
  };

  const handleClearCache = async () => {
    try {
      setIsClearingCache(true);
      await clearAppCacheAndReload();
    } catch (err) {
      console.error("Cache clear error:", err);
      window.location.reload();
    }
  };

  const BackArrow = isUrdu ? ArrowRight : ArrowLeft;

  return (
    <>
      <header className="sticky top-0 z-30 h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs flex items-center justify-between px-3 sm:px-6">
        {/* 1. Left: Concise Brand or Back to Dashboard */}
        <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
          {isHome ? (
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
              <img
                src={getAssetUrl("/icon-192.png")}
                alt="Jilani Autos"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-cover shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform border border-slate-200/80"
              />
              <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight whitespace-nowrap">
                {shopDisplayName}
              </div>
            </Link>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs transition active:scale-95 whitespace-nowrap flex-shrink-0"
            >
              <BackArrow className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{isUrdu ? "مرکزی صفحہ" : "Home"}</span>
            </Link>
          )}

          {/* Live Clock (Desktop only) */}
          {time && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-full border border-slate-200/60 shadow-2xs ml-2">
              <Clock className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
              <span className="whitespace-nowrap">{time}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-medium whitespace-nowrap">{t.karachi}</span>
            </div>
          )}
        </div>

        {/* 2. Right: PWA Install + Sync Pill + Language Switch + User Profile / Settings Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Offline / Online Sync Indicator */}
          <button
            type="button"
            onClick={() => triggerManualSync()}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold border transition ${
              isOnline
                ? pendingSyncCount > 0
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-300 animate-pulse"
            }`}
            title={
              isOnline
                ? pendingSyncCount > 0
                  ? `${pendingSyncCount} offline entries sync ho rahi hain. Click karein to sync karein.`
                  : "MongoDB Atlas Connected"
                : "Offline Mode: Entries mobile par mahfooz ho rahi hain. Net aate hi khud-ba-khud sync ho jayengi."
            }
          >
            <span
              className={`h-2 w-2 rounded-full flex-shrink-0 ${
                isOnline
                  ? pendingSyncCount > 0
                    ? "bg-amber-500 animate-ping"
                    : "bg-emerald-500"
                  : "bg-rose-500"
              }`}
            />
            <span className="whitespace-nowrap hidden xs:inline">
              {isOnline
                ? pendingSyncCount > 0
                  ? `Syncing (${pendingSyncCount})`
                  : "Online"
                : "Offline"}
            </span>
          </button>

          {/* Compact Language Switch */}
          <LanguageSwitch compact />

          {/* Professional User Profile & Settings Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 text-slate-800 text-xs font-bold transition active:scale-95 cursor-pointer"
              title="Settings & Profile"
            >
              <div className="h-6 w-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-black uppercase flex-shrink-0">
                {session?.user?.name ? session.user.name.charAt(0) : "A"}
              </div>
              <span className="hidden md:inline max-w-[110px] truncate text-[11px]">
                {session?.user?.name || "Admin"}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-500 transition-transform flex-shrink-0 ${
                  isProfileMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* User & Shop Details */}
                <div className="px-4 py-2 border-b border-slate-100">
                  <div className="text-xs font-extrabold text-slate-900 truncate">
                    {shopDisplayName}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="truncate">{session?.user?.name || "Admin"}</span>
                    <span>•</span>
                    <span className="capitalize font-semibold text-slate-600">
                      {userRole === "superadmin"
                        ? "Super Admin"
                        : userRole === "staff"
                        ? isUrdu
                          ? "اسٹاف"
                          : "Staff"
                        : isUrdu
                        ? "ایڈمن"
                        : "Admin"}
                    </span>
                  </div>
                </div>

                {/* Dropdown Options */}
                <div className="p-1 space-y-0.5">
                  {/* Super Admin SaaS Portal */}
                  {isSuperAdmin && (
                    <Link
                      href="/super-admin"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition"
                    >
                      <Shield className="h-4 w-4 text-indigo-600" />
                      <span>Super Admin SaaS Portal</span>
                    </Link>
                  )}

                  {/* App Version & Clear Cache */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setShowCacheModal(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <RefreshCw className="h-4 w-4 text-slate-400" />
                      <span>{isUrdu ? "کیش صاف اور اپڈیٹ کریں" : "Clear Cache & Update"}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                      v2.3
                    </span>
                  </button>

                  {/* Reset Demo Data (Clean handover) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setShowResetModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition cursor-pointer text-left"
                  >
                    <RotateCcw className="h-4 w-4 text-amber-500" />
                    <span>{isUrdu ? "ڈیمو ڈیٹا ریسیٹ کریں" : "Reset Demo Data"}</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 my-1" />

                {/* Logout Button */}
                <div className="p-1">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsProfileMenuOpen(false);
                      if (typeof window !== "undefined") {
                        localStorage.removeItem("jilani_autos_offline_session");
                        localStorage.removeItem("jilani_autos_logged_in");
                        localStorage.removeItem("gilani_autos_offline_session");
                        localStorage.removeItem("gilani_autos_logged_in");
                      }
                      await signOut({ callbackUrl: "/login" });
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{isUrdu ? "لاگ آؤٹ" : "Sign Out"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Demo Data Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 relative">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isUrdu ? "ڈیمو / ٹیسٹنگ ڈیٹا پاک کریں" : "Reset Demo Data"}
                </h3>
                <p className="text-xs text-slate-500">
                  {isUrdu ? "کلائنٹ کو ہینڈ اوور سے پہلے تمام ڈیٹا ریسیٹ کریں" : "Prepare system for clean client handover"}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
              {isUrdu
                ? "کیا آپ واقعی تمام ٹیسٹنگ اور ڈیمو ڈیٹا صاف کرنا چاہتے ہیں؟ اس عمل سے تمام فرضی انوینٹری پارٹس، بلز، کسٹمرز اور لیجر ریکارڈز ریسیٹ ہو جائیں گے اور سافٹ ویئر بالکل صاف (Clean State) میں آ جائے گا۔"
                : "Are you sure you want to reset all demo/testing data? This will clear all sample inventory, bills, customers, and mechanic entries to prepare a fresh clean state for client handover."}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition border border-slate-200"
              >
                {isUrdu ? "منسوخ کریں" : "Cancel"}
              </button>

              <button
                type="button"
                disabled={isResetting}
                onClick={handleResetData}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition flex items-center gap-2 shadow-xs"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{isUrdu ? "ریسیٹ ہو رہا ہے..." : "Resetting..."}</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{isUrdu ? "جی ہاں، ڈیٹا ریسیٹ کریں" : "Confirm Reset Data"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear App Cache Confirmation Modal */}
      {showCacheModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 relative">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isUrdu ? "کیش صاف کریں اور نیا ورژن لوڈ کریں" : "Clear Cache & Update App"}
                </h3>
                <p className="text-xs text-slate-500">
                  {isUrdu ? "لائیو سرور سے تازہ ترین کوڈ اور تبدیلیاں حاصل کریں" : "Fetch latest code and changes from server"}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
              {isUrdu
                ? "کیا آپ براؤزر یا موبائل ایپ کا کیشے صاف کر کے تازہ ترین لائیو ورژن لوڈ کرنا چاہتے ہیں؟ اس سے پرانی فائلیں اور سروس ورکرز ریفریش ہو جائیں گے تاکہ آپ کی تمام تبدیلیاں فوراً ظاہر ہو جائیں۔ آپ کا لاگ ان اور اصلی ڈیٹا بالکل محفوظ رہے گا۔"
                : "This will purge cached files, reset the Service Worker, and reload the latest build from the live server so all changes appear immediately. Your login session and database data remain completely safe."}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isClearingCache}
                onClick={() => setShowCacheModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition border border-slate-200"
              >
                {isUrdu ? "منسوخ کریں" : "Cancel"}
              </button>

              <button
                type="button"
                disabled={isClearingCache}
                onClick={handleClearCache}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {isClearingCache ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{isUrdu ? "کیش صاف ہو رہا ہے..." : "Clearing & Updating..."}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>{isUrdu ? "جی ہاں، کیش صاف کریں" : "Clear Cache & Reload"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

