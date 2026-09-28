"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import {
  X,
  LayoutDashboard,
  Receipt,
  Boxes,
  Users,
  WalletCards,
  Menu,
  History,
  BarChart3,
  AlertTriangle,
  RotateCcw,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Wrench,
  Bike,
  UserCheck,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/storage/context";
import { useLanguage } from "@/lib/i18n/context";
import { useSession, signOut } from "next-auth/react";
import { formatPKR } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Shell({ children }: { children: React.ReactNode }) {
  const [headerDrawerOpen, setHeaderDrawerOpen] = useState(false);
  const [bottomMenuOpen, setBottomMenuOpen] = useState(false);

  const pathname = usePathname();
  const { stats, resetToSampleData } = useStore();
  const { language, setLanguage, t, isUrdu } = useLanguage();
  const { data: session } = useSession();
  const [resetDone, setResetDone] = useState(false);

  // If on login page, render full screen without sidebar/navbar
  if (pathname === "/login") {
    return <main className="min-h-screen">{children}</main>;
  }

  // 5 Primary bottom navigation items for mobile
  const mobileNavItems = [
    {
      name: isUrdu ? "خلاصہ" : "Khulasa",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      name: isUrdu ? "ورکشاپ" : "Workshop",
      href: "/workshop",
      icon: Bike,
    },
    {
      name: isUrdu ? "نیا بل" : "Naya Bill",
      href: "/billing",
      icon: Receipt,
    },
    {
      name: isUrdu ? "اسٹاک" : "Stock",
      href: "/inventory",
      icon: Boxes,
    },
    {
      name: isUrdu ? "گاہک" : "Gahak",
      href: "/customers",
      icon: UserCheck,
    },
  ];

  // Secondary modules for the bottom "Menu" popup
  const secondaryModules = [
    {
      name: isUrdu ? "میکینک اور لیبر کھاتہ" : "Mechanics & Labour",
      sub: isUrdu ? "مزدوری اور دکان کا حصہ" : "Ujrat & commission hisab",
      href: "/mechanics",
      icon: Users,
      badge: stats.totalMechanicPayable > 0 ? formatPKR(stats.totalMechanicPayable) : undefined,
      badgeColor: "bg-amber-100 text-amber-800",
    },
    {
      name: isUrdu ? "پرانے بلز اور رسیدیں" : "Purane Bills & Invoices",
      sub: isUrdu ? "سابقہ پرچیاں اور ری پرنٹ" : "Pehle se bane huway bills",
      href: "/bills",
      icon: History,
      badge: `${stats.todayBillsCount} ${isUrdu ? "آج" : "Aaj"}`,
      badgeColor: "bg-blue-100 text-blue-700",
    },
    {
      name: isUrdu ? "سپلائر ادھار کھاتہ" : "Supplier Udhaar",
      sub: isUrdu ? "ہول سیل مارکیٹ کا ادھار" : "Wholesale supplier khata",
      href: "/suppliers",
      icon: WalletCards,
      badge: stats.overdue15DaysCreditCount > 0 ? `${stats.overdue15DaysCreditCount} Overdue` : undefined,
      badgeColor: "bg-rose-100 text-rose-700",
    },
    {
      name: isUrdu ? "منافع اور رپورٹس" : "Munafa & Reports",
      sub: isUrdu ? "روزانہ اور ماہانہ سیلز و منافع" : "Rozana, mahana bikri aur munafa",
      href: "/reports",
      icon: BarChart3,
      badge: isUrdu ? "رپورٹ" : "Munafa",
      badgeColor: "bg-emerald-100 text-emerald-700",
    },
  ];

  const handleResetData = async () => {
    await resetToSampleData();
    setResetDone(true);
    setTimeout(() => {
      setResetDone(false);
      setBottomMenuOpen(false);
      setHeaderDrawerOpen(false);
    }, 1500);
  };

  const isSecondaryActive =
    pathname === "/bills" || pathname === "/reports" || pathname === "/mechanics" || pathname === "/suppliers";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/70">
      {/* Desktop Sidebar (Left permanent) */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* 1. TOP HEADER MOBILE DRAWER: Shop Profile & Admin Controls */}
      {headerDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setHeaderDrawerOpen(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white lg:hidden transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${
          headerDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Header Drawer Content: Shop Info & Admin */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <div className="font-black text-xs leading-tight tracking-tight">
                {t.appName}
              </div>
              <div className="text-[10px] text-blue-300">
                {t.appSubtitle}
              </div>
            </div>
          </div>
          <button
            onClick={() => setHeaderDrawerOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Language Switcher in Drawer */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">
            {t.switchLangPrompt}:
          </span>
          <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setLanguage("roman")}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-bold transition",
                language === "roman" ? "bg-blue-600 text-white" : "text-slate-600"
              )}
            >
              Roman
            </button>
            <button
              onClick={() => setLanguage("ur")}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-bold transition",
                language === "ur" ? "bg-blue-600 text-white" : "text-slate-600"
              )}
            >
              اردو
            </button>
          </div>
        </div>

        {/* User Info Strip */}
        <div className="p-3.5 bg-blue-50/70 border-b border-blue-100/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {session?.user?.name || "Skander (Admin)"}
              </div>
              <div className="text-[10px] font-semibold text-blue-700">
                {(session?.user as any)?.role === "staff"
                  ? isUrdu ? "کاؤنٹر اسٹاف" : "Counter Staff"
                  : isUrdu ? "دکان ایڈمن / مالک" : "Shop Admin / Malik"}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            {t.counterOpen}
          </span>
        </div>

        {/* Live Shop Stats at a Glance */}
        <div className="p-3 grid grid-cols-2 gap-2 border-b border-slate-100 bg-slate-50/50">
          <div className="p-2 rounded-xl bg-white border border-slate-200/80">
            <div className="text-[9px] font-bold uppercase text-slate-400">
              {t.todaySales}
            </div>
            <div className="text-xs font-black text-emerald-600 mt-0.5">
              {formatPKR(stats.todaySales)}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-white border border-slate-200/80">
            <div className="text-[9px] font-bold uppercase text-slate-400">
              {t.totalParts}
            </div>
            <div className="text-xs font-black text-slate-800 mt-0.5">
              {stats.totalPartsCount} Parts
            </div>
          </div>
        </div>

        {/* Full Directory Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isUrdu ? "دکان کے تمام شعبے" : "Dukan Ke Tamam Modules"}
          </div>
          {[
            { name: isUrdu ? "دکان کا خلاصہ" : "Dukan Ka Khulasa", href: "/", icon: LayoutDashboard },
            { name: isUrdu ? "ورکشاپ لائیو بے" : "Live Workshop Bay", href: "/workshop", icon: Bike },
            { name: isUrdu ? "نیا بل (فاسٹ POS)" : "Naya Bill (Fast POS)", href: "/billing", icon: Receipt },
            { name: isUrdu ? "سامان اور اسٹاک" : "Saman & Stock", href: "/inventory", icon: Boxes },
            { name: isUrdu ? "گاہکوں کا ریکارڈ" : "Gahak Record", href: "/customers", icon: UserCheck },
            { name: isUrdu ? "میکینک کھاتہ" : "Mechanics & Labour", href: "/mechanics", icon: Users },
            { name: isUrdu ? "پرانے بلز" : "Purane Bills", href: "/bills", icon: History },
            { name: isUrdu ? "سپلائر ادھار" : "Supplier Udhaar", href: "/suppliers", icon: WalletCards },
            { name: isUrdu ? "منافع اور رپورٹس" : "Munafa & Reports", href: "/reports", icon: BarChart3 },
          ].map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setHeaderDrawerOpen(false)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              </Link>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-200/90 bg-slate-50 space-y-2">
          <button
            onClick={handleResetData}
            className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span>{resetDone ? t.resetSuccess : t.resetData}</span>
          </button>

          <button
            onClick={async () => {
              await signOut({ redirect: false });
              window.location.href = "/login";
            }}
            className="w-full h-8 px-3 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-rose-100"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{t.logout}</span>
          </button>
        </div>
      </div>

      {/* 2. BOTTOM MENU SHEET: Exclusively for Non-Bottom Modules */}
      {bottomMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setBottomMenuOpen(false)}
        />
      )}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-4 pb-20 lg:hidden transform transition-transform duration-300 ease-in-out ${
          bottomMenuOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mb-3" />

        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div>
            <h3 className="font-black text-sm text-slate-900">
              {t.moreOptions}
            </h3>
            <p className="text-[11px] text-slate-500">
              {isUrdu
                ? "دیگر تمام شعبے اور ریکارڈز"
                : "Additional shop management modules"}
            </p>
          </div>
          <button
            onClick={() => setBottomMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {secondaryModules.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setBottomMenuOpen(false)}
                className={cn(
                  "p-3 rounded-2xl border transition flex items-center justify-between gap-3 group",
                  isActive
                    ? "bg-blue-50 border-blue-300 shadow-xs"
                    : "bg-slate-50/80 border-slate-200/80 hover:bg-slate-100"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      isActive
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-700 border border-slate-200"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs text-slate-900 leading-tight">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.sub}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.badge && (
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        item.badgeColor
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition" />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            onClick={handleResetData}
            className="text-[11px] font-bold text-slate-600 hover:text-blue-700 flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span>{resetDone ? t.resetSuccess : t.resetData}</span>
          </button>

          <button
            onClick={async () => {
              await signOut({ redirect: false });
              window.location.href = "/login";
            }}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{t.logout}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onOpenMobile={() => setHeaderDrawerOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 lg:p-7 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

        {/* Mobile Friendly Bottom Nav Bar */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-xl px-2 py-1 flex items-center justify-around">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href && !bottomMenuOpen;
            const Icon = item.icon;

            if (isActive) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center -mt-4 transition-all duration-200"
                >
                  <div className="h-11 w-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 ring-4 ring-white animate-in zoom-in-95 duration-150">
                    <Icon className="h-5 w-5 stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-black text-blue-700 mt-0.5 tracking-tight">
                    {item.name}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center py-1 px-2.5 rounded-xl transition text-slate-500 hover:text-slate-800 active:scale-95"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold mt-0.5">{item.name}</span>
              </Link>
            );
          })}

          {/* 6th Tab: Menu (Opens the non-bottom modules sheet) */}
          <button
            onClick={() => setBottomMenuOpen(!bottomMenuOpen)}
            className={cn(
              "flex flex-col items-center transition active:scale-95",
              bottomMenuOpen || isSecondaryActive
                ? "-mt-4 text-blue-700"
                : "py-1 px-2.5 text-slate-500 hover:text-slate-800"
            )}
          >
            {bottomMenuOpen || isSecondaryActive ? (
              <>
                <div className="h-11 w-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 ring-4 ring-white animate-in zoom-in-95 duration-150">
                  <Menu className="h-5 w-5 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-black text-blue-700 mt-0.5 tracking-tight">
                  {t.moreOptions}
                </span>
              </>
            ) : (
              <>
                <Menu className="h-5 w-5" />
                <span className="text-[10px] font-semibold mt-0.5">
                  {t.moreOptions}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
