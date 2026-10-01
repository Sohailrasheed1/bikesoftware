"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Boxes,
  Users,
  History,
  WalletCards,
  BarChart3,
  Wrench,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  Bike,
  UserCheck,
} from "lucide-react";
import { cn, formatPKR } from "@/lib/utils";
import { useStore } from "@/lib/storage/context";
import { useLanguage } from "@/lib/i18n/context";
import { useSession, signOut } from "next-auth/react";

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { stats } = useStore();
  const { t, isUrdu } = useLanguage();
  const { data: session } = useSession();

  const navigation = [
    {
      name: isUrdu ? "دکان کا خلاصہ" : "Dukan Ka Khulasa",
      sub: isUrdu ? "Dashboard Overview" : "خلاصہ و اعداد و شمار",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      name: isUrdu ? "ورکشاپ لائیو بے" : "Live Workshop Bay",
      sub: isUrdu ? "10 گاڑیوں کا لائیو کام" : "10 Gariyon Ka Live Kaam",
      href: "/workshop",
      icon: Bike,
      highlight: true,
      badge: stats.activeJobsCount > 0 ? `${stats.activeJobsCount} Live` : undefined,
      badgeVariant: "success",
    },
    {
      name: isUrdu ? "نیا بل بنائیں" : "Naya Bill Banayein",
      sub: isUrdu ? "فاسٹ پوائنٹ آف سیل" : "Fast POS & Billing",
      href: "/billing",
      icon: Receipt,
    },
    {
      name: isUrdu ? "میکینک اور لیبر" : "Mechanics & Labour",
      sub: isUrdu ? "مزدوری و کمیشن کھاتہ" : "Mazdoori & Commission",
      href: "/mechanics",
      icon: Users,
      badge: stats.totalMechanicPayable > 0 ? formatPKR(stats.totalMechanicPayable) : undefined,
      badgeVariant: "warning",
    },
    {
      name: isUrdu ? "سامان اور اسٹاک" : "Saman & Stock",
      sub: isUrdu ? "اسٹاک مینجمنٹ و الرٹس" : "Inventory & Stock Limits",
      href: "/inventory",
      icon: Boxes,
      badge: stats.lowStockCount > 0 ? `${stats.lowStockCount} ${isUrdu ? "کم" : "Kam"}` : undefined,
      badgeVariant: "warning",
    },
    {
      name: isUrdu ? "گاہکوں کا ریکارڈ" : "Gahak Record",
      sub: isUrdu ? "گاہک ڈائریکٹری و ہسٹری" : "Customer History & Khata",
      href: "/customers",
      icon: UserCheck,
    },
    {
      name: isUrdu ? "پرانے بلز و رسیدیں" : "Purane Bills",
      sub: isUrdu ? "سابقہ انوائسز اور پرنٹس" : "Bill History & Invoices",
      href: "/bills",
      icon: History,
    },
    {
      name: isUrdu ? "سپلائر کا ادھار" : "Supplier Udhaar",
      sub: isUrdu ? "ہول سیل کھاتہ و اقساط" : "Wholesale Khata & Payments",
      href: "/suppliers",
      icon: WalletCards,
      badge: stats.overdue15DaysCreditCount > 0 ? `${stats.overdue15DaysCreditCount} Due` : undefined,
      badgeVariant: "danger",
    },
    {
      name: isUrdu ? "منافع اور رپورٹس" : "Munafa & Reports",
      sub: isUrdu ? "بکری اور خالص منافع" : "Sales & Profit Analytics",
      href: "/reports",
      icon: BarChart3,
    },
  ];

  return (
    <aside className="w-72 flex-shrink-0 flex flex-col h-full glass-sidebar border-r border-slate-200/80 bg-white">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-200/80 flex items-center gap-3.5">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Wrench className="h-6 w-6 stroke-[2.2]" />
        </div>
        <div>
          <h1 className="font-extrabold text-base tracking-tight text-slate-900 leading-tight">
            {(session?.user as any)?.shopName || t.appName}
          </h1>
          <p className="text-[11px] font-semibold text-blue-600 tracking-wide">
            {t.appSubtitle}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {isUrdu ? "اصلی مینو / شعبہ جات" : "Main Navigation Menu"}
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150",
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                  : item.highlight
                  ? "bg-blue-50 text-blue-700 hover:bg-blue-100/80 border border-blue-200/70"
                  : "text-slate-700 hover:bg-slate-100/90 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 transition-transform group-hover:scale-110 flex-shrink-0",
                    isActive ? "text-white" : item.highlight ? "text-blue-600" : "text-slate-500"
                  )}
                />
                <div className="min-w-0">
                  <div className="leading-snug">{item.name}</div>
                  <div
                    className={cn(
                      "text-[10px] font-medium leading-none mt-0.5",
                      isActive ? "text-blue-100" : "text-slate-400"
                    )}
                  >
                    {item.sub}
                  </div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={cn(
                    "text-[10px] font-extrabold px-2 py-0.5 rounded-full border",
                    item.badgeVariant === "danger"
                      ? "bg-rose-100 text-rose-700 border-rose-200 animate-pulse"
                      : item.badgeVariant === "success"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-black animate-pulse"
                      : "bg-amber-100 text-amber-800 border-amber-200"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Overdue Alert Strip if exists */}
      {stats.overdue15DaysCreditCount > 0 && (
        <div className="mx-3 mb-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-[11px] text-amber-900 leading-tight">
            <span className="font-bold">
              {stats.overdue15DaysCreditCount}{" "}
              {isUrdu ? "سپلائر ادھار" : "Supplier Udhaar"}
            </span>{" "}
            {isUrdu
              ? "15 دن سے زائد پرانے زیر التواء ہیں۔"
              : "15 din se zyada pending hain."}
          </div>
        </div>
      )}

      {/* User / Session Footer */}
      <div className="p-4 border-t border-slate-200/80 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {session?.user?.name || "Gilani Autos (Admin)"}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {(session?.user as any)?.role === "staff"
                  ? isUrdu
                    ? "کاؤنٹر اسٹاف"
                    : "Counter Staff"
                  : isUrdu
                  ? "دکان کا مالک / ایڈمن"
                  : "Shop Admin / Malik"}
              </div>
            </div>
          </div>
          <button
            onClick={async () => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("gilani_autos_offline_session");
                localStorage.removeItem("gilani_autos_logged_in");
              }
              await signOut({ callbackUrl: "/login" });
            }}
            title={t.logout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
