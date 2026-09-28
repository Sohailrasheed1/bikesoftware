"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  PlusCircle,
  RotateCcw,
  Bell,
  Clock,
  CheckCircle2,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/storage/context";
import { useLanguage } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface NavbarProps {
  onOpenMobile: () => void;
}

export function Navbar({ onOpenMobile }: NavbarProps) {
  const { stats, resetToSampleData } = useStore();
  const { language, setLanguage, t, isUrdu } = useLanguage();
  const [time, setTime] = useState<string>("");
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        new Intl.DateTimeFormat(isUrdu ? "ur-PK" : "en-PK", {
          weekday: "short",
          day: "numeric",
          month: "short",
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

  const handleReset = async () => {
    await resetToSampleData();
    setResetConfirm(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  return (
    <header className="sticky top-0 z-30 h-16 glass-nav flex items-center justify-between px-3 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
          aria-label="Open navigation drawer"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Live Clock / Location */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100/90 px-3 py-1.5 rounded-full border border-slate-200/60 shadow-xs">
          <Clock className="h-3.5 w-3.5 text-blue-600" />
          <span>{time || t.loading}</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 font-medium">{t.karachi}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language Switcher Toggle (Roman Urdu <-> Proper Urdu) */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-inner">
          <button
            type="button"
            onClick={() => setLanguage("roman")}
            title="Switch to Roman Urdu"
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all duration-150 flex items-center gap-1",
              language === "roman"
                ? "bg-white text-blue-700 shadow-xs ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <span>Roman Urdu</span>
          </button>
          <button
            type="button"
            onClick={() => setLanguage("ur")}
            title="اردو میں تبدیل کریں"
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all duration-150 flex items-center gap-1",
              language === "ur"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <span>🇵🇰 اردو</span>
          </button>
        </div>

        {/* Reset Sample Data Button */}
        {resetConfirm ? (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 p-1 rounded-xl animate-in fade-in">
            <span className="text-xs text-amber-800 font-semibold px-2">
              {t.resetConfirmTitle}
            </span>
            <Button
              size="sm"
              variant="danger"
              className="h-7 px-2.5 text-xs font-bold"
              onClick={handleReset}
            >
              {t.yes}, Reset
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-xs"
              onClick={() => setResetConfirm(false)}
            >
              {t.no}
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="text-xs font-medium text-slate-600 hidden md:flex items-center"
            onClick={() => setResetConfirm(true)}
            title={t.resetData}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
            {t.resetData}
          </Button>
        )}

        {resetSuccess && (
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t.resetSuccess}
          </div>
        )}

        {/* Low Stock Alerts Pill */}
        <Link
          href="/inventory?filter=low"
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
          title={t.lowStockAlert}
        >
          <Bell className="h-5 w-5" />
          {(stats.lowStockCount > 0 || stats.outOfStockCount > 0) && (
            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-ping" />
          )}
        </Link>

        {/* Quick Live Bay Button */}
        <Link href="/workshop" className="hidden sm:inline-flex">
          <Button
            size="sm"
            variant="outline"
            className="shadow-xs font-bold border-blue-200 bg-blue-50/80 text-blue-700 hover:bg-blue-100 flex items-center gap-1.5 text-xs"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {t.liveWorkshop} ({stats.activeJobsCount || 0})
            </span>
          </Button>
        </Link>

        {/* Quick New Bill Button */}
        <Link href="/billing">
          <Button
            size="sm"
            variant="primary"
            className="shadow-sm font-bold bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm px-3 sm:px-4"
          >
            <PlusCircle className="h-4 w-4 mr-1.5" />
            <span>{t.newBill}</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
