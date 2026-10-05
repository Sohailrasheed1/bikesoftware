"use client";

import React from "react";
import Link from "next/link";
import {
  Boxes,
  Users,
  Receipt,
  AlertTriangle,
  WalletCards,
  ChevronRight,
  Bike,
  UserCheck,
  History,
  BarChart3,
  TrendingUp,
  Package,
} from "lucide-react";
import { useStore } from "@/lib/storage/context";
import { useLanguage } from "@/lib/i18n/context";
import { formatPKR } from "@/lib/utils";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function DashboardPage() {
  const { stats } = useStore();
  const { t, isUrdu } = useLanguage();
  const { canViewSalesAndProfit, canAccessModule, isLoading } = useCurrentUser();



  // The 8 Core Shop Modules - Clean, Minimalist, Zero-Clutter App Launcher Grid
  const modules = [
    {
      id: "billing",
      name: isUrdu ? "نیا بل بنائیں" : "Naya Bill",
      sub: isUrdu ? "فاسٹ POS سیل" : "Fast POS & Sale",
      href: "/billing",
      icon: Receipt,
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-200",
      borderColor: "border-emerald-300 hover:border-emerald-500",
      badge: isUrdu ? "کاؤنٹر بل" : "Fast Bill",
      badgeStyle: "bg-emerald-100 text-emerald-800 font-bold",
      visible: canAccessModule("pos"),
    },
    {
      id: "workshop",
      name: isUrdu ? "ورکشاپ لائیو بے" : "Live Workshop",
      sub: isUrdu ? "10 گاڑیوں کا کام" : "10 Service Bays",
      href: "/workshop",
      icon: Bike,
      iconColor: "text-blue-600 bg-blue-50 border-blue-200",
      borderColor: "border-blue-300 hover:border-blue-500",
      badge: `${stats.activeJobsCount} ${isUrdu ? "گاڑیاں" : "Live"}`,
      badgeStyle: stats.activeJobsCount > 0 ? "bg-blue-100 text-blue-800 font-black animate-pulse" : "bg-slate-100 text-slate-600",
      visible: canAccessModule("workshop"),
    },
    {
      id: "inventory",
      name: isUrdu ? "سامان اور اسٹاک" : "Saman & Stock",
      sub: isUrdu ? "ریٹ لسٹ اور پرزے" : "Parts & Rate List",
      href: "/inventory",
      icon: Boxes,
      iconColor: "text-indigo-600 bg-indigo-50 border-indigo-200",
      borderColor: "border-indigo-300 hover:border-indigo-500",
      badge: `${stats.totalPartsCount} ${isUrdu ? "پرزے" : "Parts"}`,
      badgeStyle: stats.lowStockCount > 0 ? "bg-amber-100 text-amber-900 font-bold" : "bg-indigo-50 text-indigo-700",
      visible: canAccessModule("inventory"),
    },
    {
      id: "suppliers",
      name: isUrdu ? "سپلائر ادھار" : "Supplier Udhaar",
      sub: isUrdu ? "مارکیٹ کا کھاتہ" : "Wholesale Khata",
      href: "/suppliers",
      icon: WalletCards,
      iconColor: "text-rose-600 bg-rose-50 border-rose-200",
      borderColor: "border-rose-300 hover:border-rose-500",
      badge: stats.overdue15DaysCreditCount > 0 ? `${stats.overdue15DaysCreditCount} Overdue` : formatPKR(stats.totalPendingSupplierCredit),
      badgeStyle: stats.overdue15DaysCreditCount > 0 ? "bg-rose-100 text-rose-800 font-bold animate-pulse" : "bg-rose-50 text-rose-700",
      visible: canAccessModule("suppliers"),
    },
    {
      id: "customers",
      name: isUrdu ? "گاہکوں کا ریکارڈ" : "Gahak Record",
      sub: isUrdu ? "فون نمبر اور کھاتہ" : "Contacts & History",
      href: "/customers",
      icon: UserCheck,
      iconColor: "text-cyan-600 bg-cyan-50 border-cyan-200",
      borderColor: "border-cyan-300 hover:border-cyan-500",
      badge: `${stats.totalCustomersCount} ${isUrdu ? "گاہک" : "Gahak"}`,
      badgeStyle: "bg-cyan-100 text-cyan-800 font-bold",
      visible: canAccessModule("customers"),
    },
    {
      id: "mechanics",
      name: isUrdu ? "میکینک کھاتہ" : "Mechanics",
      sub: isUrdu ? "مزدوری اور کمیشن" : "Labour & Payouts",
      href: "/mechanics",
      icon: Users,
      iconColor: "text-violet-600 bg-violet-50 border-violet-200",
      borderColor: "border-violet-300 hover:border-violet-500",
      badge: stats.totalMechanicPayable > 0 ? formatPKR(stats.totalMechanicPayable) : `${stats.totalMechanicsCount} Staff`,
      badgeStyle: stats.totalMechanicPayable > 0 ? "bg-amber-100 text-amber-900 font-bold" : "bg-slate-100 text-slate-600",
      visible: canAccessModule("mechanics"),
    },
    {
      id: "bills",
      name: isUrdu ? "پرانے بلز" : "Purane Bills",
      sub: isUrdu ? "رسیدیں اور پرنٹ" : "Invoices & Reprint",
      href: "/bills",
      icon: History,
      iconColor: "text-slate-600 bg-slate-100 border-slate-200",
      borderColor: "border-slate-300 hover:border-slate-500",
      badge: `${stats.todayBillsCount} ${isUrdu ? "آج" : "Today"}`,
      badgeStyle: "bg-slate-100 text-slate-700 font-bold",
      visible: canAccessModule("bills"),
    },
    {
      id: "reports",
      name: isUrdu ? "منافع اور رپورٹس" : "Munafa & Reports",
      sub: isUrdu ? "سیلز اور خالص منافع" : "Sales & Profit",
      href: "/reports",
      icon: BarChart3,
      iconColor: "text-teal-600 bg-teal-50 border-teal-200",
      borderColor: "border-teal-300 hover:border-teal-500",
      badge: isUrdu ? "منافع" : "Profit",
      badgeStyle: "bg-teal-100 text-teal-800 font-bold",
      visible: canAccessModule("reports"),
    },
  ];

  const visibleModules = modules.filter((m) => m.visible);

  return (
    <div className="w-full space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* 1. TOP COMPACT STATUS STRIP: Single line, crystal clear, zero clutter */}
      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <span className="text-xs sm:text-sm font-black text-slate-900">
            {t.counterOpen}
          </span>
          {canViewSalesAndProfit ? (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-xs sm:text-sm font-bold text-emerald-600">
                {isUrdu ? "آج کی سیل:" : "Today Sale:"} {formatPKR(stats.todaySales)}
              </span>
            </>
          ) : (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-xs sm:text-sm font-bold text-blue-600">
                {isUrdu ? "کاؤنٹر سیشن فعال ہے" : "Active Counter Session"}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <span>{stats.todayBillsCount} {isUrdu ? "بلز بنائے گئے" : "Bills Created"}</span>
        </div>
      </div>

      {/* 2. THE MODULE BOXES: Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {visibleModules.map((m) => {
          const Icon = m.icon;

          return (
            <Link
              key={m.id}
              href={m.href}
              className={`group p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border-2 ${m.borderColor} shadow-xs hover:shadow-lg transition-all active:scale-95 flex flex-col justify-between min-h-[145px] sm:min-h-[175px]`}
            >
              {/* Top Row: Icon + Badge */}
              <div className="flex items-start justify-between gap-1.5">
                <div className={`h-11 w-11 sm:h-13 sm:w-13 rounded-xl sm:rounded-2xl flex items-center justify-center border shadow-xs group-hover:scale-110 transition-transform flex-shrink-0 ${m.iconColor}`}>
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <span className={`text-[9px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full truncate max-w-[90px] sm:max-w-none ${m.badgeStyle}`}>
                  {m.badge}
                </span>
              </div>

              {/* Middle: Title & Subtitle */}
              <div className="my-1.5 sm:my-2.5">
                <h2 className="font-black text-sm sm:text-lg text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                  {m.name}
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500 font-semibold mt-0.5 line-clamp-1">
                  {m.sub}
                </p>
              </div>

              {/* Bottom: Action Trigger */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px] sm:text-xs font-black text-slate-500 group-hover:text-blue-600 transition-colors">
                <span>{isUrdu ? "کھولیں" : "Open"}</span>
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* 3. BOTTOM FINANCIAL / OPERATIONAL SUMMARY STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
        {canViewSalesAndProfit ? (
          <div className="p-3 bg-white rounded-xl border border-slate-200/90 text-center">
            <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">
              {t.todaySales}
            </div>
            <div className="text-sm sm:text-lg font-black text-emerald-600 mt-0.5">
              {formatPKR(stats.todaySales)}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-white rounded-xl border border-slate-200/90 text-center">
            <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">
              {isUrdu ? "آج کے بلز" : "Today Invoices"}
            </div>
            <div className="text-sm sm:text-lg font-black text-emerald-600 mt-0.5">
              {stats.todayBillsCount} {isUrdu ? "بلز" : "Bills"}
            </div>
          </div>
        )}

        {canViewSalesAndProfit ? (
          <div className="p-3 bg-white rounded-xl border border-slate-200/90 text-center">
            <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">
              {t.totalInventoryVal}
            </div>
            <div className="text-sm sm:text-lg font-black text-slate-800 mt-0.5">
              {formatPKR(stats.totalInventoryValue)}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-white rounded-xl border border-slate-200/90 text-center">
            <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">
              {isUrdu ? "کل پرزہ جات" : "Total Stock Items"}
            </div>
            <div className="text-sm sm:text-lg font-black text-slate-800 mt-0.5">
              {stats.totalPartsCount} {isUrdu ? "پرزے" : "Parts"}
            </div>
          </div>
        )}

        <div className="p-3 bg-white rounded-xl border border-slate-200/90 text-center">
          <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">
            {t.lowStockAlert}
          </div>
          <div className="text-sm sm:text-lg font-black text-amber-700 mt-0.5">
            {stats.lowStockCount} {isUrdu ? "پرزے" : "Parts"}
          </div>
        </div>

        {canViewSalesAndProfit && canAccessModule("suppliers") ? (
          <div className="p-3 bg-white rounded-xl border border-slate-200/90 text-center">
            <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">
              {t.supplierPending}
            </div>
            <div className="text-sm sm:text-lg font-black text-rose-600 mt-0.5">
              {formatPKR(stats.totalPendingSupplierCredit)}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-white rounded-xl border border-slate-200/90 text-center">
            <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">
              {isUrdu ? "کل گاہک" : "Total Customers"}
            </div>
            <div className="text-sm sm:text-lg font-black text-blue-600 mt-0.5">
              {stats.totalCustomersCount} {isUrdu ? "گاہک" : "Customers"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
