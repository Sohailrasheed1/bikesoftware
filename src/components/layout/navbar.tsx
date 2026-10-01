"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { useLanguage } from "@/lib/i18n/context";
import { useSession, signOut } from "next-auth/react";
import { useStore } from "@/lib/storage/context";

export function Navbar() {
  const pathname = usePathname();
  const { t, isUrdu } = useLanguage();
  const { data: session } = useSession();
  const { isOnline, pendingSyncCount, triggerManualSync, resetToSampleData } = useStore();
  const isHome = pathname === "/";
  const [time, setTime] = useState<string>("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const userRole = (session?.user as any)?.role;
  const isSuperAdmin = userRole === "superadmin";
  const shopDisplayName = (session?.user as any)?.shopName || "Gilani Autos";

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

  const BackArrow = isUrdu ? ArrowRight : ArrowLeft;

  return (
    <>
      <header className="sticky top-0 z-30 h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs flex items-center justify-between px-3 sm:px-6">
        {/* 1. Left: Concise Brand or Back to Dashboard */}
        <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
          {isHome ? (
            <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform">
                🏍️
              </div>
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

        {/* 2. Right: Demo Data Reset + Offline/Online Status + SuperAdmin link + Language Switch + User Role + Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Demo Data Reset Button */}
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300/80 text-[11px] font-bold transition shadow-2xs active:scale-95 cursor-pointer"
            title={isUrdu ? "ڈیمو / ٹیسٹنگ ڈیٹا پاک کریں" : "Reset Demo / Testing Data"}
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-700 flex-shrink-0" />
            <span className="hidden xs:inline">{isUrdu ? "ڈیٹا ریسیٹ" : "Reset Data"}</span>
          </button>

          {/* Super Admin Quick Access (Only for Platform Super Admin) */}
          {isSuperAdmin && (
            <Link
              href="/super-admin"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition shadow-xs"
              title="Super Admin SaaS Portal"
            >
              <Shield className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />
              <span className="hidden sm:inline">SaaS Portal</span>
            </Link>
          )}

          {/* Offline / Online Sync Indicator */}
          <button
            type="button"
            onClick={() => triggerManualSync()}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold border transition ${
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
            <span className="whitespace-nowrap">
              {isOnline
                ? pendingSyncCount > 0
                  ? `Syncing (${pendingSyncCount})`
                  : "Online"
                : "Offline Mode"}
            </span>
          </button>

          {/* Compact Language Switch */}
          <LanguageSwitch compact />

          {/* User Info (Tablet & Desktop only) */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100/80 border border-slate-200/70 text-[11px] font-bold text-slate-700">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{session?.user?.name || "Admin"}</span>
          </div>

          {/* Logout Button */}
          <button
            onClick={async () => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("gilani_autos_offline_session");
                localStorage.removeItem("gilani_autos_logged_in");
              }
              await signOut({ callbackUrl: "/login" });
            }}
            title={t.logout}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 rounded-xl transition flex-shrink-0 cursor-pointer"
            aria-label={t.logout}
          >
            <LogOut className="h-4 w-4" />
          </button>
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
    </>
  );
}

