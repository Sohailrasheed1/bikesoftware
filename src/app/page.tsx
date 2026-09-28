"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Boxes,
  Users,
  Receipt,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  WalletCards,
  CheckCircle2,
  Printer,
  ChevronRight,
  Package,
  Wrench,
  Bike,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import { useStore } from "@/lib/storage/context";
import { useLanguage } from "@/lib/i18n/context";
import { formatPKR, formatDate, formatDateTime, daysSince } from "@/lib/utils";
import { Bill } from "@/types";

export default function DashboardPage() {
  const { stats, parts, bills, supplierCredits, jobCards } = useStore();
  const { t, isUrdu } = useLanguage();
  const [activeTab, setActiveTab] = useState<"workshop" | "bills" | "stock" | "credits">("workshop");
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<Bill | null>(null);

  const activeJobs = jobCards.filter(
    (j) => j.status !== "Completed" && j.status !== "Cancelled"
  );

  const lowStockParts = parts.filter(
    (p) => p.currentStock <= p.minStockLimit
  );

  const overdueCredits = supplierCredits.filter(
    (c) => c.status !== "Paid" && daysSince(c.purchaseDate) >= 15
  );

  const recentBills = bills.slice(0, 6);

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-300">
      {/* Top Welcome Header - Clean & Focused */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {t.counterOpen}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {t.appName}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t.welcome}
          </h1>
          <p className="text-xs text-slate-500 font-medium max-w-xl">
            {t.welcomeSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/billing" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 text-sm h-11 px-5"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              {t.newBill}
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Clean Metric Cards (High Readability) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <Link href="/reports">
          <Card className="glass-card-hover border-slate-200/80 hover:border-emerald-300 cursor-pointer h-full">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t.todaySales}
                </span>
                <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">
                {formatPKR(stats.todaySales)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-bold text-slate-700">
                  {stats.todayBillsCount} {isUrdu ? "بلز" : "Bills"}
                </span>
                <span>{isUrdu ? "آج بنائے گئے" : "aaj banaye gaye"}</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Total Inventory Value */}
        <Link href="/inventory">
          <Card className="glass-card-hover border-slate-200/80 hover:border-blue-300 cursor-pointer h-full">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t.totalInventoryVal}
                </span>
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Boxes className="h-5 w-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                {formatPKR(stats.totalInventoryValue)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-bold text-slate-700">
                  {stats.totalPartsCount} {isUrdu ? "پرزہ جات" : "Parts"}
                </span>
                <span>{isUrdu ? "دکان میں موجود ہیں" : "dukan mein hain"}</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Low Stock Alerts */}
        <div
          onClick={() => setActiveTab("stock")}
          className="cursor-pointer"
        >
          <Card
            className={`glass-card-hover h-full transition ${
              stats.lowStockCount > 0
                ? "border-amber-300 bg-amber-50/40"
                : "border-slate-200/80"
            }`}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t.lowStockAlert}
                </span>
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center border ${
                    stats.lowStockCount > 0
                      ? "bg-amber-100 text-amber-700 border-amber-200 animate-pulse"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <div
                className={`text-2xl sm:text-3xl font-black mt-2 ${
                  stats.lowStockCount > 0 ? "text-amber-700" : "text-slate-800"
                }`}
              >
                {stats.lowStockCount} {isUrdu ? "پرزے" : "Parts"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {stats.lowStockCount > 0 ? (
                  <span className="text-amber-800 font-semibold">
                    {isUrdu ? "اسٹاک منگوانے کی ضرورت ہے" : "Stock mangwane ki zaroorat hai"}
                  </span>
                ) : (
                  <span>{isUrdu ? "تمام پرزوں کا اسٹاک درست ہے" : "Sab parts ka stock theek hai"}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Supplier Udhaar */}
        <Link href="/suppliers">
          <Card
            className={`glass-card-hover h-full transition ${
              stats.overdue15DaysCreditCount > 0
                ? "border-rose-300 bg-rose-50/30"
                : "border-slate-200/80"
            }`}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t.supplierPending}
                </span>
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center border ${
                    stats.overdue15DaysCreditCount > 0
                      ? "bg-rose-100 text-rose-700 border-rose-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  <WalletCards className="h-5 w-5" />
                </div>
              </div>
              <div
                className={`text-2xl sm:text-3xl font-black mt-2 ${
                  stats.totalPendingSupplierCredit > 0 ? "text-rose-700" : "text-slate-900"
                }`}
              >
                {formatPKR(stats.totalPendingSupplierCredit)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {stats.overdue15DaysCreditCount > 0 ? (
                  <span className="text-rose-700 font-bold">
                    {stats.overdue15DaysCreditCount} {t.overdueCredit15Days}
                  </span>
                ) : (
                  <span>{isUrdu ? "کھاتہ درست چل رہا ہے" : "Khata theek chal raha hai"}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 4 Fast Shortcuts for Counter & Workshop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/workshop"
          className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-blue-500 hover:shadow-sm transition flex items-center gap-3 group"
        >
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
            <Bike className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <span>{t.workshop}</span>
              {activeJobs.length > 0 && (
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              {activeJobs.length} {isUrdu ? "گاڑیاں کام پر" : "gariyan kaam par"}
            </div>
          </div>
        </Link>

        <Link
          href="/billing"
          className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-blue-500 hover:shadow-sm transition flex items-center gap-3 group"
        >
          <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">{t.newBill}</div>
            <div className="text-[11px] text-slate-400">POS & Labour</div>
          </div>
        </Link>

        <Link
          href="/mechanics"
          className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-blue-500 hover:shadow-sm transition flex items-center gap-3 group"
        >
          <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">{t.mechanics}</div>
            <div className="text-[11px] text-slate-400">Labour & % Commission</div>
          </div>
        </Link>

        <Link
          href="/inventory"
          className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-blue-500 hover:shadow-sm transition flex items-center gap-3 group"
        >
          <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">{t.inventory}</div>
            <div className="text-[11px] text-slate-400">{stats.totalPartsCount} {isUrdu ? "آئٹمز" : "items"}</div>
          </div>
        </Link>
      </div>

      {/* Main Tabbed Information */}
      <Card className="glass-card shadow-sm border-slate-200/80">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 self-start flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("workshop")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === "workshop"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🏍️ {t.workshop} ({activeJobs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("bills")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === "bills"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🧾 {t.recentBills} ({recentBills.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("stock")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === "stock"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ⚠️ {t.urgentStock} ({lowStockParts.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("credits")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === "credits"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ⏳ {t.supplierCredit} ({overdueCredits.length})
              </button>
            </div>

            <Link
              href={
                activeTab === "workshop"
                  ? "/workshop"
                  : activeTab === "bills"
                  ? "/bills"
                  : activeTab === "stock"
                  ? "/inventory"
                  : "/suppliers"
              }
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-end sm:self-center"
            >
              <span>{t.viewAll}</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* TAB 0: Live Workshop Bays */}
          {activeTab === "workshop" && (
            <div className="divide-y divide-slate-100">
              {activeJobs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <Bike className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700">
                    {isUrdu ? "فی الحال ورکشاپ میں کوئی گاڑی کام میں نہیں ہے" : "Filhal shop par koi gari kaam mein nahi hai"}
                  </p>
                  <Link href="/workshop">
                    <Button size="sm" variant="secondary" className="mt-2 text-xs font-bold">
                      {isUrdu ? "ورکشاپ بے کھولیں" : "Workshop Bay Kholein"}
                    </Button>
                  </Link>
                </div>
              ) : (
                activeJobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-slate-900 text-white font-black text-xs flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[8px] text-blue-300">BAY</span>
                        <span>{job.bayNumber.toString().padStart(2, "0")}</span>
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-slate-900">
                            {job.bikeRegNumber}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-100">
                            {job.bikeModel}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              job.status === "Ready for Bill"
                                ? "bg-emerald-100 text-emerald-800 animate-pulse"
                                : job.status === "Waiting for Parts"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            {job.status === "Ready for Bill"
                              ? t.readyForBill
                              : job.status === "Waiting for Parts"
                              ? t.waitingForParts
                              : t.inProgress}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {t.customerName}: <strong className="text-slate-700">{job.customerName}</strong> • {t.assignedMechanic}: <strong className="text-blue-700">{job.assignedMechanicName || "Workshop"}</strong> • {job.items.length} parts • {job.labourItems.length} services
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-semibold">{t.estimatedTotal}</div>
                        <div className="font-black text-sm text-slate-900">
                          {formatPKR(job.estimatedSubtotal || 0)}
                        </div>
                      </div>

                      <Link href="/workshop">
                        <Button size="sm" variant="secondary" className="text-xs font-bold gap-1">
                          <span>{isUrdu ? "دیکھیں" : "Dekhein"}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 1: Recent Bills */}
          {activeTab === "bills" && (
            <div className="divide-y divide-slate-100">
              {recentBills.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  {isUrdu ? "ابھی تک کوئی بل نہیں بنا۔" : "Abhi tak koi bill nahi bana."}
                </div>
              ) : (
                recentBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-600">
                          {bill.billNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {bill.customerName || (isUrdu ? "عام گاہک" : "Walk-in Customer")}
                        </span>
                        {bill.bikeModel && (
                          <Badge variant="outline" className="hidden sm:inline-flex text-[10px] py-0">
                            {bill.bikeModel}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{formatDateTime(bill.createdAt)}</span>
                        <span>•</span>
                        <span>{bill.items.length} {isUrdu ? "اشیاء" : "cheezen"}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-600">
                          {bill.paymentMethod}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-black text-sm text-slate-900">
                          {formatPKR(bill.grandTotal)}
                        </div>
                        <Badge
                          variant={bill.status === "Completed" ? "success" : "danger"}
                          className="text-[10px] py-0"
                        >
                          {bill.status === "Completed"
                            ? isUrdu ? "ادا ہو گیا" : "Ada Ho Gaya"
                            : t.cancelled}
                        </Badge>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs text-slate-600"
                        onClick={() => setSelectedBillForPrint(bill)}
                        title={t.print}
                      >
                        <Printer className="h-3.5 w-3.5 mr-1 text-slate-500" />
                        <span className="hidden sm:inline">{t.print}</span>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: Low Stock Alerts */}
          {activeTab === "stock" && (
            <div className="divide-y divide-slate-100">
              {lowStockParts.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 space-y-1">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                  <p className="font-bold">
                    {isUrdu ? "ماشاء اللہ! تمام پرزہ جات کا اسٹاک درست ہے۔" : "MashaAllah! Sab parts ka stock theek hai."}
                  </p>
                  <p className="text-slate-400">
                    {isUrdu ? "کوئی بھی سامان کم یا ختم نہیں ہے۔" : "Koi bhi saman kam ya khatam nahi hai."}
                  </p>
                </div>
              ) : (
                lowStockParts.map((part) => {
                  const isZero = part.currentStock === 0;

                  return (
                    <div
                      key={part.id}
                      className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {part.name}
                          </span>
                          <Badge
                            variant={isZero ? "danger" : "warning"}
                            className="text-[10px] py-0"
                          >
                            {isZero ? t.outOfStockStatus : t.lowStock}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {part.category} • Supplier: {part.supplierName}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div
                            className={`font-black text-sm ${
                              isZero ? "text-rose-600" : "text-amber-700"
                            }`}
                          >
                            {part.currentStock} {isUrdu ? "باقی" : "Baqi"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {isUrdu ? "حد" : "Hadd"}: {part.minStockLimit}
                          </div>
                        </div>

                        <Link href="/inventory">
                          <Button size="sm" variant="secondary" className="h-8 text-xs font-semibold">
                            {isUrdu ? "اسٹاک بڑھائیں" : "Stock Barhayein"}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: Overdue Supplier Credits */}
          {activeTab === "credits" && (
            <div className="divide-y divide-slate-100">
              {overdueCredits.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 space-y-1">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                  <p className="font-bold">
                    {isUrdu ? "کوئی بھی 15 دن پرانا ادھار زیر التواء نہیں ہے!" : "Koi bhi 15 din purana udhaar pending nahi hai!"}
                  </p>
                  <p className="text-slate-400">
                    {isUrdu ? "سپلائرز کا کھاتہ بالکل اپڈیٹ ہے۔" : "Suppliers ka khata bilkul update hai."}
                  </p>
                </div>
              ) : (
                overdueCredits.map((credit) => {
                  const days = daysSince(credit.purchaseDate);

                  return (
                    <div
                      key={credit.id}
                      className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {credit.supplierName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {credit.supplierPhone}
                          </span>
                          <Badge variant="danger" className="text-[10px] py-0 animate-pulse">
                            {days} {isUrdu ? "دن ہو گئے" : "Din Ho Gaye"}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {isUrdu ? "مال" : "Maal"}: {credit.purchasedParts}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-black text-sm text-rose-600">
                            {formatPKR(credit.remainingBalance)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {t.remaining}
                          </div>
                        </div>

                        <Link href="/suppliers">
                          <Button size="sm" className="h-8 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold">
                            {t.recordInstallment}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill Receipt Modal */}
      <ReceiptModal
        bill={selectedBillForPrint}
        isOpen={!!selectedBillForPrint}
        onClose={() => setSelectedBillForPrint(null)}
      />
    </div>
  );
}
