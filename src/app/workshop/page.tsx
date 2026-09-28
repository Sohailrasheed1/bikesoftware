"use client";

import React, { useState } from "react";
import {
  Wrench,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Bike,
  User,
  Trash2,
  Printer,
  ChevronDown,
  Layers,
  ArrowRight,
  Sparkles,
  DollarSign,
  Package,
  Check,
  X,
  Percent,
} from "lucide-react";
import { useStore } from "@/lib/storage/context";
import { VehicleJobCard, Part, Bill, BillLabourItem, BillItem } from "@/types";
import { formatPKR, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceiptModal } from "@/components/pos/receipt-modal";

export default function WorkshopBayPage() {
  const {
    jobCards,
    parts,
    mechanics,
    customers,
    bills,
    createJobCard,
    updateJobCard,
    addPartToJobCard,
    updateJobCardPartQty,
    removePartFromJobCard,
    addLabourToJobCard,
    removeLabourFromJobCard,
    completeJobCardAndGenerateBill,
    deleteJobCard,
  } = useStore();

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState<string>("AllActive");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [selectedJobForPart, setSelectedJobForPart] = useState<VehicleJobCard | null>(null);
  const [selectedJobForLabour, setSelectedJobForLabour] = useState<VehicleJobCard | null>(null);
  const [selectedJobForCheckout, setSelectedJobForCheckout] = useState<VehicleJobCard | null>(null);

  // Print Receipt modal
  const [completedBill, setCompletedBill] = useState<Bill | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // New Job Form
  const [bayNumber, setBayNumber] = useState<number>(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [bikeModel, setBikeModel] = useState("Honda CD 70");
  const [bikeRegNumber, setBikeRegNumber] = useState("");
  const [complaintDescription, setComplaintDescription] = useState("");
  const [assignedMechanicId, setAssignedMechanicId] = useState("");
  const [newJobError, setNewJobError] = useState("");

  // Part adding modal state
  const [partSearch, setPartSearch] = useState("");
  const [selectedPartId, setSelectedPartId] = useState("");
  const [partQty, setPartQty] = useState(1);
  const [partError, setPartError] = useState("");

  // Labour adding modal state
  const [labourDesc, setLabourDesc] = useState("");
  const [labourAmount, setLabourAmount] = useState<number | "">("");
  const [labourMechanicId, setLabourMechanicId] = useState("");
  const [labourShopCut, setLabourShopCut] = useState<number>(30);
  const [labourError, setLabourError] = useState("");

  // Checkout modal state
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<Bill["paymentMethod"]>("Cash");
  const [checkoutDiscount, setCheckoutDiscount] = useState<number>(0);
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // Handle open New Job Modal: Auto pick next free Bay (1 to 10)
  const handleOpenNewJobModal = () => {
    const activeBays = jobCards
      .filter((j) => j.status !== "Completed" && j.status !== "Cancelled")
      .map((j) => j.bayNumber);
    let nextBay = 1;
    for (let i = 1; i <= 10; i++) {
      if (!activeBays.includes(i)) {
        nextBay = i;
        break;
      }
    }
    setBayNumber(nextBay);
    setCustomerName("");
    setCustomerPhone("");
    setBikeModel("Honda CD 70");
    setBikeRegNumber("");
    setComplaintDescription("");
    setAssignedMechanicId(mechanics[0]?.id || "");
    setNewJobError("");
    setIsNewJobModalOpen(true);
  };

  // Select customer autofill
  const handleCustomerSelect = (custId: string) => {
    const cust = customers.find((c) => c.id === custId);
    if (cust) {
      setCustomerName(cust.name);
      setCustomerPhone(cust.phone);
      if (cust.bikeModel) setBikeModel(cust.bikeModel);
      if (cust.bikeRegNumber) setBikeRegNumber(cust.bikeRegNumber);
    }
  };

  // Submit New Job Card
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewJobError("");
    if (!bikeRegNumber.trim()) {
      setNewJobError("Gari ka registration number (e.g. KHI-1234) likhna lazmi hai.");
      return;
    }

    const assignedMech = mechanics.find((m) => m.id === assignedMechanicId);

    try {
      await createJobCard({
        bayNumber: Number(bayNumber),
        customerName: customerName.trim() || "Walk-in Customer",
        customerPhone: customerPhone.trim() || undefined,
        bikeModel,
        bikeRegNumber: bikeRegNumber.trim().toUpperCase(),
        complaintDescription: complaintDescription.trim() || undefined,
        assignedMechanicId: assignedMechanicId || undefined,
        assignedMechanicName: assignedMech?.name || undefined,
      });
      setIsNewJobModalOpen(false);
    } catch (err: any) {
      setNewJobError(err.message || "Gari dakhil karne mein masla aaya.");
    }
  };

  // Add Part Submit
  const handleAddPartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobForPart || !selectedPartId) return;
    setPartError("");

    try {
      await addPartToJobCard(selectedJobForPart.id, selectedPartId, Number(partQty) || 1);
      setSelectedJobForPart(null);
      setSelectedPartId("");
      setPartQty(1);
      setPartSearch("");
    } catch (err: any) {
      setPartError(err.message || "Saman add karne mein masla aaya.");
    }
  };

  // Open Labour Modal
  const handleOpenLabourModal = (job: VehicleJobCard) => {
    setSelectedJobForLabour(job);
    setLabourDesc("");
    setLabourAmount("");
    const defaultMech =
      mechanics.find((m) => m.id === job.assignedMechanicId) || mechanics[0];
    setLabourMechanicId(defaultMech?.id || "");
    setLabourShopCut(defaultMech?.defaultShopCutPercentage ?? 30);
    setLabourError("");
  };

  // Add Labour Submit
  const handleAddLabourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobForLabour) return;
    setLabourError("");

    if (!labourDesc.trim()) {
      setLabourError("Kaam / Service ki tafseel likhein.");
      return;
    }
    const amt = Number(labourAmount);
    if (!amt || amt <= 0) {
      setLabourError("Labour charges (mublagh) sahi darj karein.");
      return;
    }

    const mech = mechanics.find((m) => m.id === labourMechanicId);
    const mechName = mech ? mech.name : "Workshop Mechanic";

    try {
      await addLabourToJobCard(selectedJobForLabour.id, {
        description: labourDesc.trim(),
        amount: amt,
        mechanicId: labourMechanicId || undefined,
        mechanicName: mechName,
        shopCutPercentage: Number(labourShopCut) || 0,
      });
      setSelectedJobForLabour(null);
    } catch (err: any) {
      setLabourError(err.message || "Labour shamil karne mein masla aaya.");
    }
  };

  // Open Complete / Checkout Modal
  const handleOpenCheckout = (job: VehicleJobCard) => {
    setSelectedJobForCheckout(job);
    setCheckoutPaymentMethod("Cash");
    setCheckoutDiscount(0);
    setCheckoutNotes("");
    setCheckoutError("");
  };

  // Execute Complete & Generate Bill
  const handleExecuteCheckout = async () => {
    if (!selectedJobForCheckout) return;
    setCheckoutError("");
    setCheckoutSubmitting(true);

    try {
      const { bill } = await completeJobCardAndGenerateBill(
        selectedJobForCheckout.id,
        checkoutPaymentMethod,
        Number(checkoutDiscount) || 0,
        checkoutNotes || undefined
      );

      setSelectedJobForCheckout(null);
      // Open receipt modal immediately for printing!
      setCompletedBill(bill);
      setIsReceiptModalOpen(true);
    } catch (err: any) {
      setCheckoutError(err.message || "Bill generate karne mein masla aaya.");
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  // Filtering Job Cards
  const filteredJobs = jobCards.filter((job) => {
    const isActive = job.status !== "Completed" && job.status !== "Cancelled";
    if (statusFilter === "AllActive" && !isActive) return false;
    if (statusFilter === "In Progress" && job.status !== "In Progress") return false;
    if (statusFilter === "Waiting for Parts" && job.status !== "Waiting for Parts") return false;
    if (statusFilter === "Ready for Bill" && job.status !== "Ready for Bill") return false;
    if (statusFilter === "Completed" && job.status !== "Completed") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchReg = job.bikeRegNumber.toLowerCase().includes(q);
      const matchModel = job.bikeModel.toLowerCase().includes(q);
      const matchCust = job.customerName.toLowerCase().includes(q);
      const matchPhone = job.customerPhone?.toLowerCase().includes(q);
      const matchMech = job.assignedMechanicName?.toLowerCase().includes(q);
      if (!matchReg && !matchModel && !matchCust && !matchPhone && !matchMech) return false;
    }
    return true;
  });

  // Calculate live stats
  const activeBikes = jobCards.filter((j) => j.status !== "Completed" && j.status !== "Cancelled");
  const inProgressCount = activeBikes.filter((j) => j.status === "In Progress").length;
  const waitingPartsCount = activeBikes.filter((j) => j.status === "Waiting for Parts").length;
  const readyCount = activeBikes.filter((j) => j.status === "Ready for Bill").length;
  const liveTotalAmount = activeBikes.reduce((acc, j) => acc + (j.estimatedSubtotal || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
                <Wrench className="h-6 w-6" />
              </span>
              Live Workshop Bay
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-200">
              {activeBikes.length} Gariyan Kaam Par
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Shop par live 10 gariyon ka saman aur labour track karein — Kaam mukammal hote hi 1-click bill print karein!
          </p>
        </div>

        <Button
          onClick={handleOpenNewJobModal}
          size="lg"
          className="gap-2 font-black shadow-lg shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-5 w-5" />
          Nayi Gari Dakhil Karein (New Job Card)
        </Button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Kul Gariyan (Active)
            </div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {activeBikes.length} <span className="text-xs text-slate-400 font-semibold">/ 10 Bays</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Bike className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Kaam Jari Hai
            </div>
            <div className="text-2xl font-black text-amber-600 mt-0.5">
              {inProgressCount}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Bill K Liye Tayyar
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">
              {readyCount}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 text-white border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">
              Live Workshop Running Total
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {formatPKR(liveTotalAmount)}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center font-bold">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { label: "Active Bays (All)", value: "AllActive" },
            { label: `Kaam Jari (${inProgressCount})`, value: "In Progress" },
            { label: `Saman Ka Intezar (${waitingPartsCount})`, value: "Waiting for Parts" },
            { label: `Tayyar / Bill (${readyCount})`, value: "Ready for Bill" },
            { label: "Mukammal Bills (History)", value: "Completed" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === tab.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Bike No, Model, Customer, Mechanic..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Workshop Bays Grid */}
      {filteredJobs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
          <div className="h-16 w-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Bike className="h-8 w-8" />
          </div>
          <div className="text-base font-bold text-slate-700">
            Filhal is filter mein koi gari maujood nahi
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Jab bhi shop par koi gari aaye, aap "Nayi Gari Dakhil Karein" button se bay allot karke saman aur labour add kar sakte hain.
          </p>
          <Button onClick={handleOpenNewJobModal} variant="secondary" className="mt-2 text-xs font-bold">
            + Nayi Gari Shamil Karein
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredJobs.map((job) => {
            const partsTotal = job.items.reduce((acc, i) => acc + i.totalPrice, 0);
            const labourTotal = job.labourItems.reduce((acc, l) => acc + l.amount, 0);
            const isCompleted = job.status === "Completed";

            return (
              <div
                key={job.id}
                className={`rounded-3xl border transition-all duration-200 bg-white overflow-hidden shadow-sm flex flex-col justify-between ${
                  job.status === "Ready for Bill"
                    ? "border-emerald-300 ring-2 ring-emerald-500/20"
                    : isCompleted
                    ? "border-slate-200 opacity-80"
                    : "border-slate-200/90 hover:border-blue-300 hover:shadow-md"
                }`}
              >
                {/* Card Header: Bay & Status */}
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-blue-900 text-white font-black flex flex-col items-center justify-center shadow-md">
                      <span className="text-[9px] uppercase tracking-tighter text-blue-300">BAY</span>
                      <span className="text-lg leading-none">{job.bayNumber.toString().padStart(2, "0")}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900 tracking-tight">
                          {job.bikeRegNumber}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                          {job.bikeModel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" />
                          {job.customerName}
                        </span>
                        {job.customerPhone && (
                          <span className="text-slate-400">({job.customerPhone})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Dropdown / Badge */}
                  <div className="flex flex-col items-end gap-1.5">
                    {isCompleted ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Bill: {job.billNumber}
                      </span>
                    ) : (
                      <select
                        value={job.status}
                        onChange={(e) =>
                          updateJobCard(job.id, {
                            status: e.target.value as VehicleJobCard["status"],
                          })
                        }
                        className={`text-xs font-black px-2.5 py-1 rounded-xl border focus:outline-none cursor-pointer transition ${
                          job.status === "Ready for Bill"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse"
                            : job.status === "Waiting for Parts"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        <option value="In Progress">⚡ Kaam Jari Hai</option>
                        <option value="Waiting for Parts">⏳ Saman Ka Intezar</option>
                        <option value="Ready for Bill">✅ Tayyar (Bill Banayein)</option>
                      </select>
                    )}
                    <span className="text-[10px] font-mono text-slate-400">
                      Card: {job.jobCardNumber}
                    </span>
                  </div>
                </div>

                {/* Complaint / Work Request */}
                {job.complaintDescription && (
                  <div className="px-5 py-2.5 bg-amber-50/50 border-b border-amber-100/60 flex items-start gap-2 text-xs text-amber-900">
                    <span className="font-bold text-amber-700 uppercase tracking-wider text-[10px] whitespace-nowrap mt-0.5">
                      Masla / Kaam:
                    </span>
                    <span className="leading-snug">{job.complaintDescription}</span>
                  </div>
                )}

                {/* Assigned Mechanic Banner */}
                <div className="px-5 py-2 border-b border-slate-100 flex items-center justify-between text-xs bg-white">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px] font-semibold">Mechanic:</span>
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      {job.assignedMechanicName || "Not Assigned"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Dakhla: {formatDateTime(job.createdAt)}
                  </div>
                </div>

                {/* Live Section 1: Saman / Spare Parts */}
                <div className="p-4 sm:p-5 space-y-3 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Live Saman (Spare Parts Lagay Gye)
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        ({job.items.length} Items)
                      </span>
                    </div>

                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedJobForPart(job);
                          setSelectedPartId("");
                          setPartQty(1);
                          setPartSearch("");
                          setPartError("");
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200/80 flex items-center gap-1 active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Saman Add Karein
                      </button>
                    )}
                  </div>

                  {job.items.length === 0 ? (
                    <div className="py-3 px-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400 italic">
                      Abhi tak koi saman nahi lagaya gya.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {job.items.map((item) => (
                        <div
                          key={item.partId}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 transition text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-slate-800 truncate">{item.partName}</div>
                            <div className="text-[10px] text-slate-400">
                              Rate: Rs. {item.unitPrice} each
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 flex-shrink-0">
                            {!isCompleted ? (
                              <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-lg border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => updateJobCardPartQty(job.id, item.partId, -1)}
                                  className="h-5 w-5 flex items-center justify-center text-slate-500 hover:text-slate-800 font-bold"
                                >
                                  -
                                </button>
                                <span className="font-mono font-black text-xs px-1 text-slate-800">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateJobCardPartQty(job.id, item.partId, 1)}
                                  className="h-5 w-5 flex items-center justify-center text-slate-500 hover:text-slate-800 font-bold"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <span className="font-bold text-slate-700">x{item.quantity}</span>
                            )}

                            <span className="font-black text-slate-900 min-w-[65px] text-right">
                              Rs. {item.totalPrice}
                            </span>

                            {!isCompleted && (
                              <button
                                type="button"
                                onClick={() => removePartFromJobCard(job.id, item.partId)}
                                className="text-slate-400 hover:text-rose-600 p-1 transition"
                                title="Remove item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Live Section 2: Labour / Services */}
                  <div className="pt-2 border-t border-dashed border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-indigo-600" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Labour / Ujrat (مزدوری چارجز)
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          ({job.labourItems.length} Services)
                        </span>
                      </div>

                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => handleOpenLabourModal(job)}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition border border-indigo-200/80 flex items-center gap-1 active:scale-95"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Labour Add Karein
                        </button>
                      )}
                    </div>

                    {job.labourItems.length === 0 ? (
                      <div className="py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400 italic">
                        Koi labour service shamil nahi.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {job.labourItems.map((lbr) => (
                          <div
                            key={lbr.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-bold text-indigo-950 truncate">{lbr.description}</div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                Mech: {lbr.mechanicName} • Shop Cut: {lbr.shopCutPercentage}% (Rs. {lbr.shopShare})
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="font-black text-indigo-900 min-w-[65px] text-right">
                                Rs. {lbr.amount}
                              </span>
                              {!isCompleted && (
                                <button
                                  type="button"
                                  onClick={() => removeLabourFromJobCard(job.id, lbr.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Live Subtotal & 1-Click Bill Print */}
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="space-x-3 text-slate-500 font-semibold">
                      <span>Saman: <strong className="text-slate-800">Rs. {partsTotal}</strong></span>
                      <span>Labour: <strong className="text-indigo-800">Rs. {labourTotal}</strong></span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1.5">
                        Ab Tak Ka Total:
                      </span>
                      <span className="text-base sm:text-lg font-black text-slate-900">
                        {formatPKR(partsTotal + labourTotal)}
                      </span>
                    </div>
                  </div>

                  {!isCompleted ? (
                    <Button
                      onClick={() => handleOpenCheckout(job)}
                      size="lg"
                      className="w-full gap-2 font-black shadow-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Kaam Mukammal — Bill Banayein & Print Karein
                      <ArrowRight className="h-4 w-4 ml-auto" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        const bill = bills.find(
                          (b) => b.id === job.billId || b.billNumber === job.billNumber
                        );
                        if (bill) {
                          setCompletedBill(bill);
                          setIsReceiptModalOpen(true);
                        }
                      }}
                      variant="secondary"
                      className="w-full text-xs font-bold text-slate-700 hover:text-blue-600 gap-2 border border-slate-200"
                    >
                      <Printer className="h-4 w-4 text-blue-600" />
                      <span>Bill Dobara Print Karein ({job.billNumber})</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODAL 1: Nayi Gari Dakhil Karein (New Job Card) --- */}
      <Modal
        isOpen={isNewJobModalOpen}
        onClose={() => setIsNewJobModalOpen(false)}
        title="Nayi Gari Workshop Mein Dakhil Karein"
        description="Gari aur customer ki tafseel likhein taake live saman aur labour record kiya ja saky"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateJob} className="space-y-4">
          {newJobError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {newJobError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Workshop Bay Number *
              </label>
              <select
                value={bayNumber}
                onChange={(e) => setBayNumber(Number(e.target.value))}
                className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <option key={num} value={num}>
                    Bay {num.toString().padStart(2, "0")} {num <= 3 ? "(Front Counter)" : "(Main Bay)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motorcycle Model *
              </label>
              <select
                value={bikeModel}
                onChange={(e) => setBikeModel(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
              >
                <option value="Honda CD 70">Honda CD 70</option>
                <option value="Honda CG 125">Honda CG 125</option>
                <option value="Yamaha YBR 125">Yamaha YBR 125</option>
                <option value="Yamaha YB 125Z">Yamaha YB 125Z</option>
                <option value="Suzuki GS 150">Suzuki GS 150</option>
                <option value="Suzuki GR 150">Suzuki GR 150</option>
                <option value="United 70">United 70</option>
                <option value="Road Prince 70">Road Prince 70</option>
                <option value="Honda CB 150F">Honda CB 150F</option>
                <option value="Universal / Other">Universal / Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Registration Number (نمبر پلیٹ) *"
              placeholder="e.g. KHI-9921 ya LHR-450"
              value={bikeRegNumber}
              onChange={(e) => setBikeRegNumber(e.target.value)}
              required
              className="text-xs uppercase font-mono font-bold"
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Zimedar Mechanic (Ustad)
              </label>
              <select
                value={assignedMechanicId}
                onChange={(e) => setAssignedMechanicId(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Mechanic Select Karein --</option>
                {mechanics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.specialty || "Mechanic"}) - {m.defaultShopCutPercentage}% Shop
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Autofill */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Gahak (Customer) Ki Maloomat
              </span>
              {customers.length > 0 && (
                <select
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="text-[11px] py-1 px-2 border rounded-lg bg-white text-slate-600 font-semibold"
                >
                  <option value="">Purana Customer Select Karein...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.bikeRegNumber || c.phone})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                label="Customer Name"
                placeholder="e.g. Ali Khan"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="text-xs"
              />
              <Input
                label="Phone Number"
                placeholder="0300-1234567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Gari Ka Masla / Customer Kaam (Complaint / Work Description)
            </label>
            <textarea
              value={complaintDescription}
              onChange={(e) => setComplaintDescription(e.target.value)}
              placeholder="e.g. Engine awaz kar raha hai, oil tabdeel karna hai, break loose hai..."
              rows={2}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setIsNewJobModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="font-bold gap-2">
              <Check className="h-4 w-4" />
              Bay Mein Gari Shamil Karein
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 2: Saman / Part Add Karein --- */}
      <Modal
        isOpen={Boolean(selectedJobForPart)}
        onClose={() => setSelectedJobForPart(null)}
        title={`Gari ${selectedJobForPart?.bikeRegNumber} Mein Saman Lagayein`}
        description="Dukan ke stock se part select karein — stock check khud ba khud hoga"
        maxWidth="md"
      >
        <form onSubmit={handleAddPartSubmit} className="space-y-4">
          {partError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {partError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Saman Search Karein
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Part name, category, SKU..."
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
              {parts
                .filter(
                  (p) =>
                    !partSearch ||
                    p.name.toLowerCase().includes(partSearch.toLowerCase()) ||
                    p.category.toLowerCase().includes(partSearch.toLowerCase())
                )
                .slice(0, 15)
                .map((part) => {
                  const isSelected = selectedPartId === part.id;
                  const isOutOfStock = part.currentStock <= 0;

                  return (
                    <div
                      key={part.id}
                      onClick={() => !isOutOfStock && setSelectedPartId(part.id)}
                      className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition ${
                        isOutOfStock
                          ? "opacity-50 cursor-not-allowed bg-slate-50"
                          : isSelected
                          ? "bg-blue-50 border-l-4 border-blue-600"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-800">{part.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {part.category} • Rack: {part.location || "N/A"}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-slate-900">Rs. {part.sellingPrice}</div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isOutOfStock
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          Stock: {part.currentStock}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Quantity (Tadaad) *
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                value={partQty}
                onChange={(e) => setPartQty(Math.max(1, Number(e.target.value)))}
                className="w-28 h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
              />
              {selectedPartId && (
                <span className="text-xs font-semibold text-slate-500">
                  Total: Rs.{" "}
                  {(parts.find((p) => p.id === selectedPartId)?.sellingPrice || 0) * (partQty || 1)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setSelectedJobForPart(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!selectedPartId}
              className="font-bold gap-2"
            >
              <Check className="h-4 w-4" />
              Saman Gari Mein Shamil Karein
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 3: Labour / Ujrat Add Karein --- */}
      <Modal
        isOpen={Boolean(selectedJobForLabour)}
        onClose={() => setSelectedJobForLabour(null)}
        title={`Labour Charges — ${selectedJobForLabour?.bikeRegNumber}`}
        description="Kaam ki ujrat darj karein aur mechanic select karein (Shop Malik ka % khud calculate hoga)"
        maxWidth="md"
      >
        <form onSubmit={handleAddLabourSubmit} className="space-y-4">
          {labourError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {labourError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kaam / Service Ka Naam *
            </label>
            <input
              type="text"
              placeholder="e.g. Engine Tuning, Clutch Plate Fitting, Oil Change, Wiring Fix..."
              value={labourDesc}
              onChange={(e) => setLabourDesc(e.target.value)}
              required
              className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kul Labour Amount (Rs.) *
              </label>
              <input
                type="number"
                min={0}
                placeholder="e.g. 800"
                value={labourAmount}
                onChange={(e) => setLabourAmount(e.target.value === "" ? "" : Number(e.target.value))}
                required
                className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Shop Malik Ka Hissa (%) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={labourShopCut}
                  onChange={(e) => setLabourShopCut(Number(e.target.value))}
                  required
                  className="w-full h-10 pl-3 pr-8 text-xs bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mechanic Ka Naam (Ustad) *
            </label>
            <select
              value={labourMechanicId}
              onChange={(e) => {
                const id = e.target.value;
                setLabourMechanicId(id);
                const m = mechanics.find((mech) => mech.id === id);
                if (m) setLabourShopCut(m.defaultShopCutPercentage);
              }}
              className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
            >
              {mechanics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.phone}) - Default Shop %: {m.defaultShopCutPercentage}%
                </option>
              ))}
            </select>
          </div>

          {/* Real-time Calculation Breakdown Preview */}
          {Number(labourAmount) > 0 && (
            <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200/80 space-y-1.5 text-xs">
              <div className="font-bold text-indigo-950 flex items-center justify-between">
                <span>Taqseem Ka Khulasa (Live Split):</span>
                <span>Total: Rs. {Number(labourAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-indigo-800">
                <span>🏪 Shop Malik Share ({labourShopCut}%):</span>
                <span className="font-bold">
                  Rs. {Math.round((Number(labourAmount) * labourShopCut) / 100)}
                </span>
              </div>
              <div className="flex items-center justify-between text-indigo-800">
                <span>👨‍🔧 Mechanic Share ({100 - labourShopCut}%):</span>
                <span className="font-black text-indigo-900">
                  Rs. {Number(labourAmount) - Math.round((Number(labourAmount) * labourShopCut) / 100)}
                </span>
              </div>
              <div className="text-[10px] text-indigo-500 pt-1 border-t border-indigo-200/60">
                Yeh raqam bill bante hi seedhi is mechanic ke alag Khata (Ledger) mein darj ho jayegi.
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setSelectedJobForLabour(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="font-bold gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Check className="h-4 w-4" />
              Labour Shamil Karein
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 4: Complete Job & Print Bill --- */}
      <Modal
        isOpen={Boolean(selectedJobForCheckout)}
        onClose={() => setSelectedJobForCheckout(null)}
        title="Kaam Mukammal — Bill Generate & Print Karein"
        description="Gari ka kaam mukammal ho chuka hai. Final bill banayein aur parchi print karein."
        maxWidth="lg"
      >
        {selectedJobForCheckout && (
          <div className="space-y-4">
            {checkoutError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {checkoutError}
              </div>
            )}

            {/* Bill Summary Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>Vehicle:</span>
                <span>{selectedJobForCheckout.bikeModel} ({selectedJobForCheckout.bikeRegNumber})</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Customer:</span>
                <span>{selectedJobForCheckout.customerName} {selectedJobForCheckout.customerPhone ? `(${selectedJobForCheckout.customerPhone})` : ""}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Spare Parts ({selectedJobForCheckout.items.length}):</span>
                  <span className="font-bold">
                    Rs. {selectedJobForCheckout.items.reduce((acc, i) => acc + i.totalPrice, 0)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Labour Services ({selectedJobForCheckout.labourItems.length}):</span>
                  <span className="font-bold text-indigo-700">
                    Rs. {selectedJobForCheckout.labourItems.reduce((acc, l) => acc + l.amount, 0)}
                  </span>
                </div>
                {checkoutDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount (رعایت):</span>
                    <span>-Rs. {checkoutDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-300">
                  <span>Net Grand Total (صافی بل):</span>
                  <span>
                    Rs.{" "}
                    {Math.max(
                      0,
                      selectedJobForCheckout.estimatedSubtotal - (Number(checkoutDiscount) || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Method (طریقہ ادائیگی) *
                </label>
                <select
                  value={checkoutPaymentMethod}
                  onChange={(e) => setCheckoutPaymentMethod(e.target.value as any)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cash">💵 Cash (نقد)</option>
                  <option value="EasyPaisa / JazzCash">📱 EasyPaisa / JazzCash</option>
                  <option value="Bank Transfer">🏦 Bank Transfer</option>
                  <option value="Udhaar / Credit">📝 Udhaar / Khata (Customer Credit)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Discount / Riayat (رعایت Rs.)
                </label>
                <input
                  type="number"
                  min={0}
                  value={checkoutDiscount}
                  onChange={(e) => setCheckoutDiscount(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bill Notes (اگر کوئی نوٹ لکھنا ہو)
              </label>
              <input
                type="text"
                placeholder="Optional notes for invoice..."
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setSelectedJobForCheckout(null)}
                disabled={checkoutSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleExecuteCheckout}
                isLoading={checkoutSubmitting}
                className="font-black gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
              >
                <Printer className="h-4 w-4" />
                Bill Save Karein & Parchi Print Karein
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- RECEIPT PRINT MODAL --- */}
      <ReceiptModal
        bill={completedBill}
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setCompletedBill(null);
        }}
      />
    </div>
  );
}
