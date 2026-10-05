"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  Download,
  Printer,
  DollarSign,
  Package,
  Receipt,
  Layers,
  Award,
  ArrowUpRight,
  TrendingDown,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/storage/context";
import { useLanguage } from "@/lib/i18n/context";
import { formatPKR, formatDate } from "@/lib/utils";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function ReportsPage() {
  const { bills, parts } = useStore();
  const { t, isUrdu } = useLanguage();
  const { canAccessModule, canViewSalesAndProfit, isLoading } = useCurrentUser();
  const [reportType, setReportType] = useState<"daily" | "monthly" | "yearly">("daily");

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-3 border-slate-200 border-t-blue-600 animate-spin" />
          <span className="text-xs font-bold text-slate-400">Loading reports...</span>
        </div>
      </div>
    );
  }

  if (!canAccessModule("reports") || !canViewSalesAndProfit) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="h-16 w-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">
            {isUrdu ? "رسائی محدود ہے (Access Restricted)" : "Access Restricted"}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {isUrdu
              ? "آپ کے اکاؤنٹ کو سیلز، منافع اور بزنس رپورٹس دیکھنے کی اجازت نہیں دی گئی ہے۔ اگر ضرورت ہو تو دکان کے مالک (ایڈمن) سے رابطہ کریں۔"
              : "Aapke account ko dukan ki sales aur munafa reports dekhne ki ijazat nahi di gayi. Agar zaroorat ho to dukan ke Malik (Admin) se rabta karein."}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
            >
              {isUrdu ? "واپس ڈیش بورڈ پر جائیں" : "Back to Dashboard"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
  const currentYearStr = todayStr.substring(0, 4);  // YYYY

  // Filter bills based on report type
  const completedBills = bills.filter((b) => b.status === "Completed");

  const dailyBills = completedBills.filter((b) => b.createdAt.startsWith(todayStr));
  const monthlyBills = completedBills.filter((b) => b.createdAt.startsWith(currentMonthStr));
  const yearlyBills = completedBills.filter((b) => b.createdAt.startsWith(currentYearStr));

  const activeBills =
    reportType === "daily" ? dailyBills : reportType === "monthly" ? monthlyBills : yearlyBills;

  // Key Aggregates
  const totalRevenue = activeBills.reduce((acc, b) => acc + b.grandTotal, 0);
  const totalBillsCount = activeBills.length;

  let totalItemsSold = 0;
  let estimatedCost = 0;

  // Top Selling Parts Map
  const partSalesMap: Record<
    string,
    { partName: string; category: string; quantity: number; revenue: number }
  > = {};

  activeBills.forEach((bill) => {
    bill.items.forEach((item) => {
      totalItemsSold += item.quantity;
      const itemCost = item.quantity * item.purchasePrice;
      estimatedCost += itemCost;

      if (!partSalesMap[item.partId]) {
        partSalesMap[item.partId] = {
          partName: item.partName,
          category: item.category,
          quantity: 0,
          revenue: 0,
        };
      }
      partSalesMap[item.partId].quantity += item.quantity;
      partSalesMap[item.partId].revenue += item.totalPrice;
    });
  });

  // Calculate net profit using exact FIFO batch profit when available, else estimate
  const exactFifoProfit = activeBills.reduce((totalProfit, bill) => {
    const billProfit = bill.items.reduce((sum, item) => {
      if (item.itemProfit !== undefined) {
        return sum + item.itemProfit;
      }
      return sum + (item.totalPrice - item.purchasePrice * item.quantity);
    }, 0);
    return totalProfit + billProfit;
  }, 0);

  const estimatedProfit = Math.max(0, exactFifoProfit || (totalRevenue - estimatedCost));
  const profitMarginPercent = totalRevenue > 0 ? Math.round((estimatedProfit / totalRevenue) * 100) : 0;

  const topSellingParts = Object.values(partSalesMap).sort(
    (a, b) => b.quantity - a.quantity
  );

  // CSV Export Feature
  const handleExportCSV = () => {
    const headers = [
      "Bill Number",
      "Date",
      "Customer Name",
      "Phone",
      "Bike Model",
      "Bike Reg",
      "Items Count",
      "Total Amount",
      "Payment Method",
    ];
    const rows = activeBills.map((b) => [
      b.billNumber,
      formatDate(b.createdAt),
      `"${b.customerName}"`,
      b.customerPhone || "-",
      b.bikeModel || "-",
      b.bikeRegNumber || "-",
      b.items.reduce((acc, it) => acc + it.quantity, 0),
      b.grandTotal,
      b.paymentMethod,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `jilani_autos_report_${reportType}_${todayStr}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            {t.reportsTitle}
          </h1>
          <p className="text-xs text-slate-500">
            {t.reportsSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            className="h-10 text-xs font-bold text-slate-700 bg-white"
            onClick={handleExportCSV}
          >
            <Download className="h-4 w-4 mr-1.5 text-slate-500" />
            <span>{t.exportCsv}</span>
          </Button>
        </div>
      </div>

      {/* Timeframe Period Switcher */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit border border-slate-200">
        <button
          type="button"
          onClick={() => setReportType("daily")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
            reportType === "daily"
              ? "bg-white text-blue-700 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          📅 {t.dailyReport}
        </button>
        <button
          type="button"
          onClick={() => setReportType("monthly")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
            reportType === "monthly"
              ? "bg-white text-blue-700 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          🗓️ {t.monthlyReport}
        </button>
        <button
          type="button"
          onClick={() => setReportType("yearly")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
            reportType === "yearly"
              ? "bg-white text-blue-700 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          📈 {t.yearlyReport}
        </button>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Sales / Revenue */}
        <Card className="glass-card border-slate-200/90">
          <CardContent className="p-4 sm:p-5">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Kul Bikri (Total Sales)
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {formatPKR(totalRevenue)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              <span className="font-bold text-slate-700">{totalBillsCount} Bills</span> se hasil hui
            </div>
          </CardContent>
        </Card>

        {/* Cost / Kharid Lagat */}
        <Card className="glass-card border-slate-200/90">
          <CardContent className="p-4 sm:p-5">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Saman Ki Lagat (Cost)
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-700 mt-1">
              {formatPKR(estimatedCost)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Saman ki asal wholesale kharid
            </div>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="glass-card border-emerald-300 bg-emerald-50/40">
          <CardContent className="p-4 sm:p-5">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
              Saafi Munafa (Net Profit)
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
              {formatPKR(estimatedProfit)}
            </div>
            <div className="text-xs text-emerald-800 font-bold mt-1">
              +{profitMarginPercent}% Munafa Margin
            </div>
          </CardContent>
        </Card>

        {/* Items Sold */}
        <Card className="glass-card border-slate-200/90">
          <CardContent className="p-4 sm:p-5">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Bikne Wala Saman
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">
              {totalItemsSold} Pieces
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Mukhtalif motorcycle parts
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Selling Parts Card */}
      <Card className="glass-card border-slate-200/90 shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            Sab Se Zyada Bikne Wale Motorcycle Parts
          </CardTitle>
          <span className="text-xs text-slate-400 font-semibold">
            {topSellingParts.length} parts shamil hain
          </span>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {topSellingParts.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                Is dauran koi saman nahi bika.
              </div>
            ) : (
              topSellingParts.map((part, index) => (
                <div
                  key={index}
                  className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center font-black text-xs ${
                        index === 0
                          ? "bg-amber-100 text-amber-800"
                          : index === 1
                          ? "bg-slate-200 text-slate-700"
                          : index === 2
                          ? "bg-orange-100 text-orange-800"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      #{index + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 truncate">
                        {part.partName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {part.category}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-sm text-slate-900">
                      {part.quantity} pieces bikey
                    </div>
                    <div className="text-[11px] font-bold text-emerald-600">
                      {formatPKR(part.revenue)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
