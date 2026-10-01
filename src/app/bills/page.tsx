"use client";

import React, { useState } from "react";
import {
  History,
  Search,
  Printer,
  Calendar,
  Eye,
  Trash2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Bike,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import { useStore } from "@/lib/storage/context";
import { useLanguage } from "@/lib/i18n/context";
import { Bill } from "@/types";
import { formatPKR, formatDate, formatDateTime } from "@/lib/utils";

export default function BillHistoryPage() {
  const { bills, cancelBill, deleteBill } = useStore();
  const { t, isUrdu } = useLanguage();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Completed" | "Cancelled">("All");
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<Bill | null>(null);
  const [billToCancel, setBillToCancel] = useState<Bill | null>(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState("");

  const handleConfirmCancel = async () => {
    if (!billToCancel) return;
    try {
      await cancelBill(billToCancel.id);
      setCancelSuccessMsg(
        `Bill ${billToCancel.billNumber} mansookh (cancel) ho gaya! Sara saman wapas stock mein shamil kar diya gaya.`
      );
      setBillToCancel(null);
      setTimeout(() => setCancelSuccessMsg(""), 5000);
    } catch (err: any) {
      alert(err.message || "Bill cancel karne mein masla aaya.");
    }
  };

  const handleDeleteBill = async (bill: Bill) => {
    if (confirm(`Kya aap waqai Bill #${bill.billNumber} (${bill.customerName}) ko delete karna chahte hain?`)) {
      try {
        await deleteBill(bill.id);
      } catch (err: any) {
        alert(err.message || "Bill delete karne mein masla aaya.");
      }
    }
  };

  const filteredBills = bills.filter((b) => {
    const s = search.toLowerCase();
    const matchesSearch =
      b.billNumber.toLowerCase().includes(s) ||
      b.customerName.toLowerCase().includes(s) ||
      (b.customerPhone && b.customerPhone.includes(s)) ||
      (b.bikeRegNumber && b.bikeRegNumber.toLowerCase().includes(s)) ||
      b.createdAt.includes(s);

    const matchesStatus =
      statusFilter === "All" || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-blue-600" />
            {t.billsTitle}
          </h1>
          <p className="text-xs text-slate-500">
            {t.billsSubtitle}
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {cancelSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{cancelSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="glass-card border-slate-200/90 shadow-xs">
        <CardContent className="p-3.5 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Bill number (e.g. SK-1001), gahak ka naam, phone ya bike number search karein..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setStatusFilter("All")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  statusFilter === "All"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sab Bills ({bills.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Completed")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  statusFilter === "Completed"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-800 hover:text-emerald-950"
                }`}
              >
                Ada Shuda
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Cancelled")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  statusFilter === "Cancelled"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-800 hover:text-rose-950"
                }`}
              >
                Mansookh (Cancelled)
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responsive View: Mobile Cards & Desktop Table */}
      {/* 1. Mobile Cards View */}
      <div className="lg:hidden space-y-3">
        {filteredBills.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs">
            Koi bill nahi mila.
          </div>
        ) : (
          filteredBills.map((bill) => {
            const isCancelled = bill.status === "Cancelled";

            return (
              <div
                key={bill.id}
                className={`p-4 rounded-2xl bg-white border shadow-xs space-y-3 ${
                  isCancelled ? "border-rose-200 bg-rose-50/20 opacity-80" : "border-slate-200/90"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-blue-700">
                        {bill.billNumber}
                      </span>
                      <Badge
                        variant={isCancelled ? "danger" : "success"}
                        className="text-[10px] py-0 font-bold"
                      >
                        {isCancelled ? "Mansookh" : "Ada Shuda"}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {formatDateTime(bill.createdAt)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-slate-900">
                      {formatPKR(bill.grandTotal)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold">
                      {bill.paymentMethod}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{bill.customerName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {bill.customerPhone || "No phone"}
                    </div>
                  </div>

                  {bill.bikeRegNumber && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {bill.bikeRegNumber}
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-slate-600 truncate">
                  <span className="font-semibold text-slate-700">Saman ({bill.items.length}):</span>{" "}
                  {bill.items.map((i) => `${i.partName} (${i.quantity})`).join(", ")}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-bold text-slate-700"
                    onClick={() => setSelectedBillForPrint(bill)}
                  >
                    <Printer className="h-3.5 w-3.5 mr-1 text-slate-500" />
                    <span>Parchi Print</span>
                  </Button>

                  <div className="flex items-center gap-1.5">
                    {!isCancelled && (
                      <button
                        type="button"
                        onClick={() => setBillToCancel(bill)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteBill(bill)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="Bill Delete Karein"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. Desktop Clean Airy Table */}
      <Card className="glass-card hidden lg:block overflow-hidden border-slate-200/90 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/90 bg-slate-100/70 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Bill #</th>
                <th className="py-3 px-3">Tareekh & Waqt</th>
                <th className="py-3 px-3">Gahak & Phone</th>
                <th className="py-3 px-3">Motorcycle</th>
                <th className="py-3 px-3 text-center">Tadad</th>
                <th className="py-3 px-3 text-right">Kul Raqam</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Koi bill nahi mila.
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => {
                  const isCancelled = bill.status === "Cancelled";

                  return (
                    <tr
                      key={bill.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isCancelled ? "bg-rose-50/30 opacity-70" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-black text-blue-700">
                        {bill.billNumber}
                      </td>

                      <td className="py-3.5 px-3 text-slate-500 font-medium">
                        {formatDateTime(bill.createdAt)}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">{bill.customerName}</div>
                        {bill.customerPhone && (
                          <div className="text-[11px] font-mono text-slate-400">
                            {bill.customerPhone}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="text-slate-800 font-medium">{bill.bikeModel || "-"}</div>
                        {bill.bikeRegNumber && (
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                            {bill.bikeRegNumber}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                        {bill.items.reduce((acc, it) => acc + it.quantity, 0)} pcs
                      </td>

                      <td className="py-3.5 px-3 text-right font-black text-slate-900">
                        <div>{formatPKR(bill.grandTotal)}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {bill.paymentMethod}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <Badge
                          variant={isCancelled ? "danger" : "success"}
                          className="font-bold text-[10px]"
                        >
                          {isCancelled ? "Mansookh" : "Ada Shuda"}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs font-bold text-slate-700"
                            onClick={() => setSelectedBillForPrint(bill)}
                            title="Receipt Dekhein ya Print Karein"
                          >
                            <Printer className="h-3.5 w-3.5 mr-1 text-slate-500" />
                            <span>Parchi</span>
                          </Button>

                          {!isCancelled && (
                            <button
                              type="button"
                              onClick={() => setBillToCancel(bill)}
                              className="p-1 text-slate-400 hover:text-amber-600 transition"
                              title="Bill Mansookh Karein (Stock wapas shamil hoga)"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteBill(bill)}
                            className="p-1 text-slate-300 hover:text-rose-600 transition"
                            title="Bill Record Delete Karein"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={!!billToCancel}
        onClose={() => setBillToCancel(null)}
        title="Kya Aap Yeh Bill Mansookh (Cancel) Karna Chahte Hain?"
        description={`Bill # ${billToCancel?.billNumber || ""}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <p className="font-bold">⚠️ Zaroori Maloomat:</p>
            <p>
              Is bill ke tamam spare parts ({billToCancel?.items.length} types) dukan ke stock mein dobara wapas shamil ho jayenge.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setBillToCancel(null)}
            >
              Nahi, Wapas Jayein
            </Button>
            <Button
              type="button"
              variant="danger"
              className="font-bold bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleConfirmCancel}
            >
              Haan, Bill Cancel Karein
            </Button>
          </div>
        </div>
      </Modal>

      {/* Print Receipt Modal */}
      <ReceiptModal
        bill={selectedBillForPrint}
        isOpen={!!selectedBillForPrint}
        onClose={() => setSelectedBillForPrint(null)}
      />
    </div>
  );
}
