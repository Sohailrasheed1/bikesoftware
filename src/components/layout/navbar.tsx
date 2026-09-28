"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  LogOut,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { useLanguage } from "@/lib/i18n/context";
import { useSession, signOut } from "next-auth/react";

export function Navbar() {
  const pathname = usePathname();
  const { t, isUrdu } = useLanguage();
  const { data: session } = useSession();
  const isHome = pathname === "/";
  const [time, setTime] = useState<string>("");

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

  const BackArrow = isUrdu ? ArrowRight : ArrowLeft;

  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs flex items-center justify-between px-3 sm:px-6">
      {/* 1. Left: Concise Brand or Back to Dashboard */}
      <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
        {isHome ? (
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform">
              🏍️
            </div>
            <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight whitespace-nowrap">
              Skander <span className="text-blue-600">Parts</span>
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

      {/* 2. Right: Language Switch + User Role + Logout */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
        {/* Compact Language Switch */}
        <LanguageSwitch compact />

        {/* User Info (Tablet & Desktop only) */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100/80 border border-slate-200/70 text-[11px] font-bold text-slate-700">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
          <span className="truncate max-w-[100px]">{session?.user?.name || "Admin"}</span>
        </div>

        {/* Logout Button */}
        <button
          onClick={async () => {
            await signOut({ redirect: false });
            window.location.href = "/login";
          }}
          title={t.logout}
          className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 rounded-xl transition flex-shrink-0"
          aria-label={t.logout}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
