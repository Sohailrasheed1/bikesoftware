"use client";

import React, { useState } from "react";
import {
  WalletCards,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Phone,
  DollarSign,
  History,
  Trash2,
  ShieldAlert,
  ArrowRight,
  Receipt,
  User,
  Edit,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useStore } from "@/lib/storage/context";
import { useLanguage } from "@/lib/i18n/context";
import { SupplierCredit } from "@/types";
import { formatPKR, formatDate, daysSince } from "@/lib/utils";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function SupplierCreditPage() {
  const {
    supplierCredits,
    addSupplierCredit,
    updateSupplierCredit,
    recordSupplierPayment,
    deleteSupplierCredit,
  } = useStore();
  const { t, isUrdu } = useLanguage();
  const { canAccessModule, isLoading } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Paid">("All");

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-3 border-slate-200 border-t-blue-600 animate-spin" />
          <span className="text-xs font-bold text-slate-400">Loading supplier khata...</span>
        </div>
      </div>
    );
  }

  if (!canAccessModule("suppliers")) {
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
              ? "آپ کے اکاؤنٹ کو سپلائر کا ادھار کھاتہ دیکھنے کی اجازت نہیں دی گئی ہے۔ دکان کے مالک سے رابطہ کریں۔"
              : "Aapke account ko Supplier Udhaar dekhne ki ijazat nahi hai. Malik (Admin) se rabta karein."}
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

  // New Credit Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    supplierName: "",
    supplierPhone: "",
    purchasedParts: "",
    quantity: 1,
    totalAmount: 0,
    purchaseDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });

  // Record Payment Modal
  const [paymentModalCredit, setPaymentModalCredit] = useState<SupplierCredit | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNotes, setPaymentNotes] = useState<string>("Cash payment installment");

  // Payment History View Modal
  const [viewHistoryCredit, setViewHistoryCredit] = useState<SupplierCredit | null>(null);

  // Edit Credit Modal
  const [editingCredit, setEditingCredit] = useState<SupplierCredit | null>(null);
  const [editFormData, setEditFormData] = useState({
    supplierName: "",
    supplierPhone: "",
    purchasedParts: "",
    quantity: 1,
    totalAmount: 0,
    dueDate: "",
  });

  const handleOpenEdit = (credit: SupplierCredit) => {
    setEditingCredit(credit);
    setEditFormData({
      supplierName: credit.supplierName,
      supplierPhone: credit.supplierPhone,
      purchasedParts: credit.purchasedParts,
      quantity: credit.quantity,
      totalAmount: credit.totalAmount,
      dueDate: credit.dueDate ? credit.dueDate.split("T")[0] : "",
    });
  };

  const handleUpdateCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCredit) return;
    await updateSupplierCredit(editingCredit.id, {
      supplierName: editFormData.supplierName,
      supplierPhone: editFormData.supplierPhone,
      purchasedParts: editFormData.purchasedParts,
      quantity: Number(editFormData.quantity) || 1,
      totalAmount: Number(editFormData.totalAmount) || 0,
      dueDate: editFormData.dueDate ? new Date(editFormData.dueDate).toISOString() : editingCredit.dueDate,
    });
    setEditingCredit(null);
  };

  // Calculations
  const totalOutstanding = supplierCredits.reduce((acc, c) => acc + c.remainingBalance, 0);
  const totalPaid = supplierCredits.reduce((acc, c) => acc + c.paidAmount, 0);
  const overdueCredits = supplierCredits.filter(
    (c) => c.status !== "Paid" && daysSince(c.purchaseDate) >= 15
  );

  const handleCreateCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addSupplierCredit({
      supplierName: formData.supplierName,
      supplierPhone: formData.supplierPhone,
      purchasedParts: formData.purchasedParts,
      quantity: Number(formData.quantity) || 1,
      totalAmount: Number(formData.totalAmount) || 0,
      purchaseDate: new Date(formData.purchaseDate).toISOString(),
      dueDate: new Date(formData.dueDate).toISOString(),
    });
    setIsAddModalOpen(false);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalCredit) return;
    try {
      await recordSupplierPayment(
        paymentModalCredit.id,
        Number(paymentAmount),
        paymentNotes
      );
      setPaymentModalCredit(null);
      setPaymentAmount(0);
    } catch (err: any) {
      alert(err.message || "Payment darj karne mein masla aaya.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Kya aap "${name}" ka udhaar record delete karna chahte hain?`)) {
      await deleteSupplierCredit(id);
    }
  };

  const filteredCredits = supplierCredits.filter((c) => {
    const s = search.toLowerCase();
    const matchesSearch =
      c.supplierName.toLowerCase().includes(s) ||
      c.supplierPhone.includes(s) ||
      c.purchasedParts.toLowerCase().includes(s);

    let matchesStatus = true;
    if (statusFilter === "Pending") {
      matchesStatus = c.status !== "Paid";
    } else if (statusFilter === "Paid") {
      matchesStatus = c.status === "Paid";
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <WalletCards className="h-6 w-6 text-blue-600" />
            {t.suppliersTitle}
          </h1>
          <p className="text-xs text-slate-500">
            {t.suppliersSubtitle}
          </p>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 text-xs sm:text-sm h-11"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          + {t.addSupplierPurchase}
        </Button>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="glass-card border-slate-200/90">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Kul Dena Hai (Total Udhaar)
            </div>
            <div className="text-2xl font-black text-rose-600 mt-1">
              {formatPKR(totalOutstanding)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Mukhtalif suppliers ka baqaya
            </div>
          </CardContent>
        </Card>

        <Card className={`glass-card ${overdueCredits.length > 0 ? "border-amber-300 bg-amber-50/40" : "border-slate-200/90"}`}>
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
              15 Din Purana Udhaar (Alert)
            </div>
            <div className="text-2xl font-black text-amber-800 mt-1">
              {overdueCredits.length} Suppliers
            </div>
            <div className="text-[11px] text-amber-900/80 mt-0.5">
              Inka waqt 15 din se zyada ho chuka hai
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-slate-200/90">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Ada Shuda (Total Paid)
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {formatPKR(totalPaid)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Jo payments ho chuki hain
            </div>
          </CardContent>
        </Card>
      </div>

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
                placeholder="Supplier ka naam, phone number ya maal ki detail search karein..."
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
                Sab ({supplierCredits.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Pending")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  statusFilter === "Pending"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-800 hover:text-rose-950"
                }`}
              >
                Baqaya Dena Hai
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Paid")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  statusFilter === "Paid"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-800 hover:text-emerald-950"
                }`}
              >
                Ada Ho Chuka
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responsive View: Mobile Cards & Desktop Table */}
      {/* 1. Mobile Cards View */}
      <div className="lg:hidden space-y-3">
        {filteredCredits.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs">
            Koi record nahi mila.
          </div>
        ) : (
          filteredCredits.map((credit) => {
            const isOverdue = credit.status !== "Paid" && daysSince(credit.purchaseDate) >= 15;
            const days = daysSince(credit.purchaseDate);

            return (
              <div
                key={credit.id}
                className={`p-4 rounded-2xl bg-white border shadow-xs space-y-3 ${
                  isOverdue ? "border-amber-300" : "border-slate-200/90"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      {credit.supplierName}
                    </h3>
                    {credit.supplierPhone ? (
                      <a
                        href={`tel:${credit.supplierPhone}`}
                        className="text-xs text-blue-700 font-bold font-mono mt-0.5 flex items-center gap-1.5 hover:underline"
                      >
                        <span className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                          <Phone className="h-3 w-3" />
                        </span>
                        <span>{credit.supplierPhone}</span>
                        <span className="text-[10px] font-normal text-slate-400">(Call)</span>
                      </a>
                    ) : (
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        No phone
                      </div>
                    )}
                  </div>

                  <Badge
                    variant={credit.status === "Paid" ? "success" : isOverdue ? "danger" : "warning"}
                    className="text-[10px] py-0 font-bold"
                  >
                    {credit.status === "Paid" ? "Mukammal Ada" : isOverdue ? `${days} Din Purana` : "Baqaya Pending"}
                  </Badge>
                </div>

                <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">
                    Maal Ki Details
                  </div>
                  <div className="font-medium mt-0.5">{credit.purchasedParts}</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Tareekh: {formatDate(credit.purchaseDate)}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      Kul Raqam
                    </div>
                    <div className="font-bold text-slate-700">
                      {formatPKR(credit.totalAmount)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      Baqaya Dena Hai
                    </div>
                    <div className="font-black text-sm text-rose-600">
                      {formatPKR(credit.remainingBalance)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setViewHistoryCredit(credit)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <History className="h-3.5 w-3.5" />
                    <span>Installments ({credit.paymentHistory.length})</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {credit.remainingBalance > 0 && (
                      <Button
                        size="sm"
                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                        onClick={() => {
                          setPaymentModalCredit(credit);
                          setPaymentAmount(credit.remainingBalance);
                        }}
                      >
                        Payment Karein
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(credit)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition"
                      title="Edit Karein"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(credit.id, credit.supplierName)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="Delete Karein"
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
                <th className="py-3 px-4">Supplier & Phone</th>
                <th className="py-3 px-3">Maal Ki Details</th>
                <th className="py-3 px-3">Kharid Tareekh</th>
                <th className="py-3 px-3 text-right">Kul Bill</th>
                <th className="py-3 px-3 text-right">Ada Shuda</th>
                <th className="py-3 px-3 text-right">Baqaya (Balance)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCredits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Koi supplier udhaar nahi mila.
                  </td>
                </tr>
              ) : (
                filteredCredits.map((credit) => {
                  const isOverdue = credit.status !== "Paid" && daysSince(credit.purchaseDate) >= 15;
                  const days = daysSince(credit.purchaseDate);

                  return (
                    <tr
                      key={credit.id}
                      className="hover:bg-slate-50/80 transition"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>{credit.supplierName}</div>
                        <div className="text-[11px] font-mono text-slate-400 font-normal">
                          {credit.supplierPhone}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-slate-700 max-w-xs truncate">
                        {credit.purchasedParts}
                      </td>

                      <td className="py-3.5 px-3 text-slate-500">
                        <div>{formatDate(credit.purchaseDate)}</div>
                        {isOverdue && (
                          <div className="text-[10px] text-amber-700 font-bold">
                            {days} din ho gaye
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right text-slate-700 font-bold">
                        {formatPKR(credit.totalAmount)}
                      </td>

                      <td className="py-3.5 px-3 text-right text-emerald-600 font-bold">
                        {formatPKR(credit.paidAmount)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-black text-rose-600">
                        {formatPKR(credit.remainingBalance)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <Badge
                          variant={credit.status === "Paid" ? "success" : isOverdue ? "danger" : "warning"}
                          className="font-bold text-[10px]"
                        >
                          {credit.status === "Paid" ? "Ada Ho Gaya" : isOverdue ? "15+ Din Overdue" : "Pending"}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setViewHistoryCredit(credit)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition"
                            title="Payment History Dekhein"
                          >
                            <History className="h-4 w-4" />
                          </button>

                          {credit.remainingBalance > 0 && (
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                              onClick={() => {
                                setPaymentModalCredit(credit);
                                setPaymentAmount(credit.remainingBalance);
                              }}
                            >
                              Payment Karein
                            </Button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(credit)}
                            className="p-1 text-slate-300 hover:text-indigo-600 transition"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(credit.id, credit.supplierName)}
                            className="p-1 text-slate-300 hover:text-rose-600 transition"
                            title="Delete"
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

      {/* Record Payment Modal */}
      <Modal
        isOpen={!!paymentModalCredit}
        onClose={() => setPaymentModalCredit(null)}
        title={`Supplier Ko Payment Karein: ${paymentModalCredit?.supplierName || ""}`}
        description="Ada ki gayi raqam aur tareeqa darj karein"
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Supplier:</span>
              <span className="font-bold text-slate-900">{paymentModalCredit?.supplierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kul Maal:</span>
              <span className="text-slate-700">{paymentModalCredit?.purchasedParts}</span>
            </div>
            <div className="flex justify-between font-bold text-rose-700 pt-1 border-t border-slate-200">
              <span>Baqaya Udhaar:</span>
              <span className="text-sm font-black">
                {formatPKR(paymentModalCredit?.remainingBalance || 0)}
              </span>
            </div>
          </div>

          <Input
            label="Kitni Raqam Ada Ki? (PKR) *"
            type="number"
            required
            min="1"
            max={paymentModalCredit?.remainingBalance}
            value={paymentAmount === 0 ? "" : paymentAmount}
            onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
            placeholder="0"
          />

          <Input
            label="Payment Detail / Note"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            placeholder="e.g. Cash payment by shop counter"
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPaymentModalCredit(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="font-bold bg-emerald-600 hover:bg-emerald-700">
              Payment Save Karein
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add New Credit Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Naya Supplier Udhaar Indiraj"
        description="Supplier se udhaar par liye gaye saman ki details likhein"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCredit} className="space-y-4">
          <Input
            label="Supplier Ka Naam *"
            required
            value={formData.supplierName}
            onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
            placeholder="e.g. Akbar Autos Saddar"
          />

          <Input
            label="Supplier Mobile Number *"
            required
            value={formData.supplierPhone}
            onChange={(e) => setFormData({ ...formData, supplierPhone: e.target.value })}
            placeholder="0300-1234567"
          />

          <Input
            label="Maal Ki Details (Konsa saman liya) *"
            required
            value={formData.purchasedParts}
            onChange={(e) => setFormData({ ...formData, purchasedParts: e.target.value })}
            placeholder="e.g. 20x CD 70 Piston, 15x CG 125 Clutch Plates"
          />

          <Input
            label="Kul Raqam (Total Bill PKR) *"
            type="number"
            required
            min="1"
            value={formData.totalAmount === 0 ? "" : formData.totalAmount}
            onChange={(e) =>
              setFormData({ ...formData, totalAmount: Number(e.target.value) || 0 })
            }
            placeholder="0"
          />

          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="Kharid Ki Tareekh *"
              type="date"
              required
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            />

            <Input
              label="Payment Wapsi Ki Tareekh (Due Date) *"
              type="date"
              required
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="font-bold">
              Udhaar Save Karein
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payment History View Modal */}
      <Modal
        isOpen={!!viewHistoryCredit}
        onClose={() => setViewHistoryCredit(null)}
        title={`Payment History: ${viewHistoryCredit?.supplierName || ""}`}
        description={`Maal: ${viewHistoryCredit?.purchasedParts || ""}`}
        maxWidth="md"
      >
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs font-bold">
            <span>Kul Bill: {formatPKR(viewHistoryCredit?.totalAmount || 0)}</span>
            <span className="text-rose-600">Baqaya: {formatPKR(viewHistoryCredit?.remainingBalance || 0)}</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {viewHistoryCredit?.paymentHistory.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Abhi tak koi installment ada nahi hui.
              </div>
            ) : (
              viewHistoryCredit?.paymentHistory.map((pmt, idx) => (
                <div key={pmt.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800">
                      Installment #{idx + 1}: {formatPKR(pmt.amount)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {pmt.notes} • {formatDate(pmt.paymentDate)}
                    </div>
                  </div>
                  <Badge variant="success" className="text-[9px] py-0">
                    Ada Ho Gaya
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Edit Supplier Credit Modal */}
      <Modal
        isOpen={!!editingCredit}
        onClose={() => setEditingCredit(null)}
        title="Supplier Udhaar Update Karein"
        description="Supplier aur maal ki details tabdeel karein"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateCredit} className="space-y-4">
          <Input
            label="Supplier Ka Naam *"
            required
            value={editFormData.supplierName}
            onChange={(e) => setEditFormData({ ...editFormData, supplierName: e.target.value })}
          />

          <Input
            label="Phone Number"
            value={editFormData.supplierPhone}
            onChange={(e) => setEditFormData({ ...editFormData, supplierPhone: e.target.value })}
            className="font-mono text-xs"
          />

          <Input
            label="Kharide Gaye Saman Ki Tafseel *"
            required
            value={editFormData.purchasedParts}
            onChange={(e) => setEditFormData({ ...editFormData, purchasedParts: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="Tadad (Quantity) *"
              type="number"
              min="1"
              required
              value={editFormData.quantity}
              onChange={(e) => setEditFormData({ ...editFormData, quantity: Number(e.target.value) })}
            />

            <Input
              label="Kul Udhaar Raqam (Rs.) *"
              type="number"
              min="0"
              required
              value={editFormData.totalAmount}
              onChange={(e) => setEditFormData({ ...editFormData, totalAmount: Number(e.target.value) })}
            />
          </div>

          <Input
            label="Payment Wapsi Ki Tareekh (Due Date) *"
            type="date"
            required
            value={editFormData.dueDate}
            onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingCredit(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="font-bold">
              Tabdeeli Mahfooz Karein
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
