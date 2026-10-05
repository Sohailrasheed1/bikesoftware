"use client";

import React, { useState, useEffect } from "react";
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  Edit,
  Trash2,
  TrendingUp,
  Tag,
  Store,
  Layers,
  CheckCircle,
  XCircle,
  PlusCircle,
  MinusCircle,
  MapPin,
  Bike,
  Filter,
  History,
  RotateCcw,
  PackagePlus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Building2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useStore } from "@/lib/storage/context";
import { useLanguage } from "@/lib/i18n/context";
import { Part, PartCategory, PurchaseBatch, RateHistoryEntry } from "@/types";
import { formatPKR, formatDate, formatCompatibleModels, toModelArray, getLocalDateString } from "@/lib/utils";
import { useToast } from "@/components/providers/toast-provider";

const CATEGORIES: { label: string; value: PartCategory }[] = [
  { label: "Engine & Transmission", value: "Engine & Transmission" },
  { label: "Brakes & Clutch", value: "Brakes & Clutch" },
  { label: "Electrical & Battery", value: "Electrical & Battery" },
  { label: "Body, Lights & Mirrors", value: "Body, Lights & Mirrors" },
  { label: "Suspension & Fork", value: "Suspension & Fork" },
  { label: "Tyres & Tubes", value: "Tyres & Tubes" },
  { label: "Cables & Levers", value: "Cables & Levers" },
  { label: "Oils & Lubricants", value: "Oils & Lubricants" },
  { label: "Chains & Sprockets", value: "Chains & Sprockets" },
  { label: "Accessories & General", value: "Accessories & General" },
];

export default function InventoryPage() {
  const {
    parts,
    addPart,
    updatePart,
    deletePart,
    updateStock,
    createPurchaseBatch,
    getPurchaseRateHistory,
    getPurchaseBatches,
    recordPurchaseReturn,
    recordStockAdjustment,
  } = useStore();
  const { t, isUrdu } = useLanguage();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [stockStatusFilter, setStockStatusFilter] = useState<"All" | "Low" | "Out">("All");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [partToDelete, setPartToDelete] = useState<Part | null>(null);

  // FIFO Modals state
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);
  const [isRateHistoryModalOpen, setIsRateHistoryModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [viewingPartBatches, setViewingPartBatches] = useState<Part | null>(null);
  const [activeBatches, setActiveBatches] = useState<PurchaseBatch[]>([]);

  // Rate History state
  const [rateHistoryList, setRateHistoryList] = useState<RateHistoryEntry[]>([]);
  const [selectedRatePartId, setSelectedRatePartId] = useState<string>("All");

  // New Batch Form State (Rule 1)
  const [batchForm, setBatchForm] = useState({
    partId: "",
    qtyPurchased: 10,
    costPrice: 0,
    sellingPrice: 0,
    supplier: "",
    purchaseDate: getLocalDateString(),
    notes: "",
  });

  // Return / Adjustment Form State (Rule 7)
  const [returnForm, setReturnForm] = useState({
    type: "purchase_return" as "purchase_return" | "adjustment",
    partId: "",
    batchId: "",
    quantity: 1,
    reason: "",
    supplier: "",
  });

  // Main Add / Edit Part Form State
  const [formData, setFormData] = useState({
    name: "",
    category: "Engine & Transmission" as PartCategory,
    sku: "",
    compatibleModels: "Honda CD 70, United 70",
    purchasePrice: 0,
    sellingPrice: 0,
    currentStock: 10,
    minStockLimit: 5,
    supplierName: "",
    supplierPhone: "",
    location: "Rack A-1",
  });

  const handleOpenAdd = () => {
    setEditingPart(null);
    setFormData({
      name: "",
      category: "Engine & Transmission",
      sku: "",
      compatibleModels: "Honda CD 70, United 70",
      purchasePrice: 0,
      sellingPrice: 0,
      currentStock: 10,
      minStockLimit: 5,
      supplierName: "",
      supplierPhone: "",
      location: "Rack A-1",
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (part: Part) => {
    setEditingPart(part);
    setFormData({
      name: part.name,
      category: part.category,
      sku: part.sku || "",
      compatibleModels: formatCompatibleModels(part.compatibleModels),
      purchasePrice: part.purchasePrice,
      sellingPrice: part.sellingPrice,
      currentStock: part.currentStock,
      minStockLimit: part.minStockLimit,
      supplierName: part.supplierName,
      supplierPhone: part.supplierPhone || "",
      location: part.location || "",
    });
    setIsAddModalOpen(true);
  };

  const handleOpenNewBatch = (partId?: string) => {
    const targetPart = parts.find((p) => p.id === partId) || parts[0];
    setBatchForm({
      partId: targetPart ? targetPart.id : "",
      qtyPurchased: 10,
      costPrice: targetPart ? targetPart.purchasePrice : 0,
      sellingPrice: targetPart ? targetPart.sellingPrice : 0,
      supplier: targetPart ? targetPart.supplierName : "",
      purchaseDate: getLocalDateString(),
      notes: "",
    });
    setIsNewBatchModalOpen(true);
  };

  const handleOpenRateHistory = async (partId?: string) => {
    setSelectedRatePartId(partId || "All");
    const history = await getPurchaseRateHistory(partId === "All" ? undefined : partId);
    setRateHistoryList(history);
    setIsRateHistoryModalOpen(true);
  };

  const handleOpenReturnModal = (partId?: string) => {
    const targetPart = parts.find((p) => p.id === partId) || parts[0];
    setReturnForm({
      type: "purchase_return",
      partId: targetPart ? targetPart.id : "",
      batchId: "",
      quantity: 1,
      reason: "Supplier return / Defective item",
      supplier: targetPart ? targetPart.supplierName : "",
    });
    setIsReturnModalOpen(true);
  };

  const handleViewBatches = async (part: Part) => {
    setViewingPartBatches(part);
    const batches = await getPurchaseBatches(part.id);
    setActiveBatches(batches);
  };

  const handleSubmitPart = async (e: React.FormEvent) => {
    e.preventDefault();
    const duplicatePart = !editingPart && formData.name.trim()
      ? parts.find((p) => p.name.trim().toLowerCase() === formData.name.trim().toLowerCase())
      : null;

    if (!editingPart && duplicatePart) {
      toast.warning("Duplicate Item", `"${duplicatePart.name}" pehle se inventory mein mojood hai!`);
      return;
    }

    const models = formData.compatibleModels
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    const partName = formData.name;
    const isEdit = !!editingPart;
    const partPayload = {
      name: formData.name,
      category: formData.category,
      sku: formData.sku || undefined,
      compatibleModels: models,
      purchasePrice: Number(formData.purchasePrice) || 0,
      sellingPrice: Number(formData.sellingPrice) || 0,
      currentStock: Number(formData.currentStock) || 0,
      minStockLimit: Number(formData.minStockLimit) || 0,
      supplierName: formData.supplierName || "Local Supplier",
      supplierPhone: formData.supplierPhone || undefined,
      location: formData.location || undefined,
    };

    // Close modal INSTANTLY (0ms lag!)
    setIsAddModalOpen(false);

    try {
      if (isEdit && editingPart) {
        await updatePart(editingPart.id, partPayload);
        toast.success("Item Update Ho Gaya", `"${partName}" ki nayi maloomat save ho gayi hain.`);
      } else {
        await addPart(partPayload);
        toast.success("Naya Item Shamil Hua", `"${partName}" ko stock mein shamil kar diya gaya.`);
      }
    } catch (err: any) {
      toast.error("Save Error", err.message || "Part save nahi ho saka.");
    }
  };

  const handleSubmitNewBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.partId) return;

    const payload = {
      partId: batchForm.partId,
      qtyPurchased: Number(batchForm.qtyPurchased) || 0,
      costPrice: Number(batchForm.costPrice) || 0,
      supplier: batchForm.supplier || "General Supplier",
      purchaseDate: batchForm.purchaseDate,
      notes: batchForm.notes,
      newSellingPrice: Number(batchForm.sellingPrice) || undefined,
    };

    const targetPart = parts.find((p) => p.id === batchForm.partId);
    const itemName = targetPart?.name || "Item";

    // Close modal INSTANTLY (0ms lag!)
    setIsNewBatchModalOpen(false);

    try {
      await createPurchaseBatch(payload);
      toast.success("Nayi Batch Save Ho Gayi", `${itemName} ka ${payload.qtyPurchased} stock shamil ho gaya.`);
    } catch (err: any) {
      toast.error("Batch Error", err.message || "Batch save nahi ho saki.");
    }
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnForm.partId) return;

    const returnType = returnForm.type;
    const qty = Number(returnForm.quantity) || 1;
    const targetPart = parts.find((p) => p.id === returnForm.partId);
    const itemName = targetPart?.name || "Item";

    // Close modal INSTANTLY (0ms lag!)
    setIsReturnModalOpen(false);

    try {
      if (returnType === "purchase_return") {
        await recordPurchaseReturn({
          partId: returnForm.partId,
          batchId: returnForm.batchId || undefined,
          quantity: qty,
          reason: returnForm.reason,
          supplier: returnForm.supplier,
        });
        toast.success("Purchase Return Darj", `${itemName} ke ${qty} pieces supplier ko wapas darj ho gaye.`);
      } else {
        await recordStockAdjustment({
          partId: returnForm.partId,
          batchId: returnForm.batchId || undefined,
          quantity: -Math.abs(qty),
          reason: returnForm.reason,
        });
        toast.success("Stock Adjustment Darj", `${itemName} ke ${qty} pieces kharabi/waste mein adjust ho gaye.`);
      }
    } catch (err: any) {
      toast.error("Adjustment Error", err.message || "Entry save nahi ho saki.");
    }
  };

  const confirmDeletePart = async () => {
    if (!partToDelete) return;
    const deleting = partToDelete;
    setPartToDelete(null);
    try {
      await deletePart(deleting.id);
      toast.success("Item Delete Ho Gaya", `"${deleting.name}" ko inventory se kamyabi se hata diya gaya.`);
    } catch (err: any) {
      toast.error("Delete Error", err.message || "Item delete nahi ho saka.");
    }
  };

  const handleQuickStock = async (part: Part, delta: number) => {
    try {
      await updateStock(part.id, delta);
      toast.info(
        delta > 0 ? "Stock Barha Diya" : "Stock Kam Kiya",
        `${part.name} ka stock ab ${part.currentStock + delta} hai.`,
        2000
      );
    } catch (err: any) {
      toast.error("Stock Error", err.message || "Stock update nahi ho saka.");
    }
  };

  // Filter Logic
  const filteredParts = parts.filter((part) => {
    const s = search.toLowerCase();
    const matchesSearch =
      part.name.toLowerCase().includes(s) ||
      part.category.toLowerCase().includes(s) ||
      (part.sku && part.sku.toLowerCase().includes(s)) ||
      part.supplierName.toLowerCase().includes(s) ||
      toModelArray(part.compatibleModels).some((m) => m.toLowerCase().includes(s));

    const matchesCategory =
      selectedCategory === "All" || part.category === selectedCategory;

    let matchesStock = true;
    if (stockStatusFilter === "Low") {
      matchesStock = part.currentStock > 0 && part.currentStock <= part.minStockLimit;
    } else if (stockStatusFilter === "Out") {
      matchesStock = part.currentStock === 0;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  const lowStockCount = parts.filter(
    (p) => p.currentStock > 0 && p.currentStock <= p.minStockLimit
  ).length;
  const outOfStockCount = parts.filter((p) => p.currentStock === 0).length;

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300">
      {/* Page Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="h-6 w-6 text-blue-600" />
            {t.inventoryTitle} (FIFO Stock)
          </h1>
          <p className="text-xs text-slate-500">
            First-In First-Out costing, purchase batches & rate history tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Rule 1: New Purchase Batch */}
          <Button
            onClick={() => handleOpenNewBatch()}
            variant="outline"
            className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold text-xs h-10"
          >
            <PackagePlus className="h-4 w-4 mr-1.5" />
            Nayi Purchase Batch
          </Button>

          {/* Rule 6: Rate History Report */}
          <Button
            onClick={() => handleOpenRateHistory()}
            variant="outline"
            className="border-blue-600 text-blue-700 hover:bg-blue-50 font-bold text-xs h-10"
          >
            <History className="h-4 w-4 mr-1.5" />
            ريٹ ہسٹری (Rate History)
          </Button>

          {/* Rule 7: Purchase Return */}
          <Button
            onClick={() => handleOpenReturnModal()}
            variant="outline"
            className="border-amber-600 text-amber-700 hover:bg-amber-50 font-bold text-xs h-10"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Purchase Return / Adjustment
          </Button>

          <Button
            onClick={handleOpenAdd}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 text-xs sm:text-sm h-10"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {t.addNewPart}
          </Button>
        </div>
      </div>

      {/* Rule 5: Low Stock Warning Banner */}
      {lowStockCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-amber-900 text-xs font-semibold">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <span>
              <strong>Low Stock Alert:</strong> {lowStockCount} items ka stock unki min_stock limit se kam hai! Nayi purchase batch add karein.
            </span>
          </div>
          <button
            onClick={() => setStockStatusFilter("Low")}
            className="px-3 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 shadow-xs"
          >
            Kam Stock Dekhein
          </button>
        </div>
      )}

      {/* Stock Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStockStatusFilter("All")}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            stockStatusFilter === "All"
              ? "bg-blue-50 border-blue-300 shadow-xs"
              : "bg-white border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            {isUrdu ? "کل اقسام (ٹوٹل)" : "Kul Saman (Total)"}
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {parts.length} {isUrdu ? "اقسام" : "Types"}
          </div>
        </div>

        <div
          onClick={() => setStockStatusFilter("All")}
          className="p-3.5 rounded-xl bg-white border border-slate-200/80 cursor-pointer"
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            {t.inStock}
          </div>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {parts.length - lowStockCount - outOfStockCount} {isUrdu ? "آئٹمز" : "Items"}
          </div>
        </div>

        <div
          onClick={() => setStockStatusFilter("Low")}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            stockStatusFilter === "Low"
              ? "bg-amber-100 border-amber-300 shadow-xs"
              : "bg-amber-50/60 border-amber-200 hover:border-amber-300"
          }`}
        >
          <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
            Kam Stock (Alerts)
          </div>
          <div className="text-xl font-black text-amber-800 mt-1">
            {lowStockCount} Items
          </div>
        </div>

        <div
          onClick={() => setStockStatusFilter("Out")}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            stockStatusFilter === "Out"
              ? "bg-rose-100 border-rose-300 shadow-xs"
              : "bg-rose-50/60 border-rose-200 hover:border-rose-300"
          }`}
        >
          <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wide">
            Khatam Shuda
          </div>
          <div className="text-xl font-black text-rose-800 mt-1">
            {outOfStockCount} Items
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="glass-card border-slate-200/90 shadow-xs">
        <CardContent className="p-3.5 sm:p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Saman ka naam, SKU, bike model ya supplier search karein..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="w-full md:w-56">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="All">Sab Categories (تمام)</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 self-start">
              <button
                type="button"
                onClick={() => setStockStatusFilter("All")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  stockStatusFilter === "All"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sab ({parts.length})
              </button>
              <button
                type="button"
                onClick={() => setStockStatusFilter("Low")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  stockStatusFilter === "Low"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-amber-800 hover:text-amber-950"
                }`}
              >
                Kam Stock ({lowStockCount})
              </button>
              <button
                type="button"
                onClick={() => setStockStatusFilter("Out")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  stockStatusFilter === "Out"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-800 hover:text-rose-950"
                }`}
              >
                Khatam ({outOfStockCount})
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop & Mobile Table */}
      <Card className="glass-card overflow-hidden border-slate-200/90 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/90 bg-slate-100/70 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Saman Ka Naam & Bike</th>
                <th className="py-3 px-3">Category / Shelf</th>
                <th className="py-3 px-3 text-right">Kharid (Latest Cost)</th>
                <th className="py-3 px-3 text-right">Bikri (Sale)</th>
                <th className="py-3 px-3 text-center">FIFO Stock (Total)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredParts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Koi part nahi mila.
                  </td>
                </tr>
              ) : (
                filteredParts.map((part) => {
                  const isZero = part.currentStock === 0;
                  const isLow = part.currentStock > 0 && part.currentStock <= part.minStockLimit;
                  const margin = part.sellingPrice - part.purchasePrice;

                  return (
                    <tr key={part.id} className="hover:bg-slate-50/80 transition group">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="font-extrabold text-slate-900 leading-snug">
                          {part.name}
                        </div>
                        <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
                          {formatCompatibleModels(part.compatibleModels)}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-slate-500">
                        <div className="font-medium text-slate-700">{part.category}</div>
                        <div className="text-[10px] text-slate-400">
                          {part.location || "Shelf -"} {part.sku ? `• #${part.sku}` : ""}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right text-slate-600 font-medium">
                        {formatPKR(part.purchasePrice)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-black text-slate-900">
                        {part.sellingPrice > 0 ? (
                          <>
                            <div>{formatPKR(part.sellingPrice)}</div>
                            <div className="text-[10px] text-emerald-600 font-semibold">
                              +{formatPKR(margin)} munafa
                            </div>
                          </>
                        ) : (
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black">
                              {isUrdu ? "بیچتے وقت طے ہوگا" : "Open Rate (Bikri Waqt)"}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickStock(part, -1)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 active:scale-90 transition"
                            title="Stock 1 kam karein"
                          >
                            <MinusCircle className="h-4 w-4" />
                          </button>
                          <span
                            className={`font-black text-sm px-2.5 py-0.5 rounded-lg ${
                              isZero
                                ? "bg-rose-100 text-rose-800"
                                : isLow
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-900"
                            }`}
                          >
                            {part.currentStock}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickStock(part, 1)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 active:scale-90 transition"
                            title="Stock 1 barhayein"
                          >
                            <PlusCircle className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Min Limit: {part.minStockLimit}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <Badge
                          variant={isZero ? "danger" : isLow ? "warning" : "success"}
                          className="font-bold text-[10px]"
                        >
                          {isZero ? "Khatam" : isLow ? "Low Stock Alert" : "In Stock"}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-3 text-slate-700">
                        <div className="font-semibold">{part.supplierName}</div>
                        {part.supplierPhone && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {part.supplierPhone}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewBatches(part)}
                            className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold transition flex items-center gap-1"
                            title="FIFO Batches Dekhein"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            <span>Batches</span>
                          </button>
                          <button
                            onClick={() => handleOpenRateHistory(part.id)}
                            className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold transition flex items-center gap-1"
                            title="Rate History"
                          >
                            <History className="h-3.5 w-3.5" />
                            <span>Rate</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(part)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="Edit Part"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setPartToDelete(part)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Part"
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

      {/* THEMED DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!partToDelete}
        onClose={() => setPartToDelete(null)}
        title="Item Delete Karein?"
        description="Yeh amal wapas nahi kiya ja sakega."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3.5">
            <div className="p-2.5 bg-rose-100 rounded-xl text-rose-600 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-rose-950">
                {partToDelete?.name}
              </h3>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                Kya aap waqai is item ko inventory se mukammal tor par delete karna chahte hain? Is se juda stock aur records hata diye jayenge.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPartToDelete(null)}
              className="text-xs font-semibold h-10 px-4"
            >
              Cancel (Wapas)
            </Button>
            <Button
              type="button"
              onClick={confirmDeletePart}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 px-4 shadow-md shadow-rose-600/20"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Haan, Delete Karein
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 1: Add / Edit Item */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingPart ? "Saman Ki Details Tabdeel Karein" : "Naya Saman Shamil Karein"}
        description="Saman ka naam, model, qeemat aur min_stock limit darj karein"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmitPart} className="space-y-4">
          <Input
            label="Saman Ka Naam (Part Name) *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Atlas Honda Piston 70cc Standard"
          />

          {!editingPart && formData.name.trim() && parts.some((p) => p.name.trim().toLowerCase() === formData.name.trim().toLowerCase()) && (() => {
            const dup = parts.find((p) => p.name.trim().toLowerCase() === formData.name.trim().toLowerCase());
            if (!dup) return null;
            return (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Khabardaar: Yeh item pehle se inventory mein mojood hai!</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  <strong>{dup.name}</strong> pehle se darj hai (Stock: <strong>{dup.currentStock}</strong>, Purani Kharid: <strong>{formatPKR(dup.purchasePrice)}</strong>, Purani Bikri: <strong>{formatPKR(dup.sellingPrice)}</strong>). Agar naya maal ya naya rate aaya hai to naya part banane ke bajaye <strong>Nayi Purchase Batch</strong> banayein taake Rate History theek rahe.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    handleOpenNewBatch(dup.id);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8"
                >
                  <PackagePlus className="h-3.5 w-3.5 mr-1.5" />
                  Is Item Ki Nayi Purchase Batch Banayein
                </Button>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as PartCategory })
                }
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="SKU / Item Code (Optional)"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="e.g. ENG-PST-01"
            />
          </div>

          <Input
            label="Compatible Bikes (Kis motorcycle mein lagega)"
            value={formData.compatibleModels}
            onChange={(e) => setFormData({ ...formData, compatibleModels: e.target.value })}
            placeholder="e.g. Honda CD 70, United 70"
          />

          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="Kharid Qeemat (Cost Price PKR) *"
              type="number"
              required
              min="0"
              value={formData.purchasePrice === 0 ? "" : formData.purchasePrice}
              onChange={(e) =>
                setFormData({ ...formData, purchasePrice: Number(e.target.value) || 0 })
              }
              placeholder="0"
            />

            <div>
              <Input
                label={isUrdu ? "فروخت ریٹ (Bikri Price - اختیاری)" : "Bikri Qeemat (Sale Price - Optional)"}
                type="number"
                min="0"
                value={formData.sellingPrice === 0 ? "" : formData.sellingPrice}
                onChange={(e) =>
                  setFormData({ ...formData, sellingPrice: Number(e.target.value) || 0 })
                }
                placeholder="0 (Khali chorr sakte hain)"
              />
              <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                {isUrdu
                  ? "اگر ابھی طے نہیں تو خالی چھوڑ دیں، کسٹمر کو بیچتے وقت درج کر لیں گے۔"
                  : "Khali chorr sakte hain, bechte waqt rate darj kar sakein ge."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="Initial Stock (Initial Batch Qty) *"
              type="number"
              required
              min="0"
              value={formData.currentStock}
              onChange={(e) =>
                setFormData({ ...formData, currentStock: Number(e.target.value) || 0 })
              }
            />

            <Input
              label="Kam Stock Alert Limit (min_stock) *"
              type="number"
              required
              min="1"
              value={formData.minStockLimit}
              onChange={(e) =>
                setFormData({ ...formData, minStockLimit: Number(e.target.value) || 0 })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Supplier Ka Naam"
              value={formData.supplierName}
              onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
              placeholder="e.g. Akbar Autos Saddar"
            />

            <Input
              label="Shelf / Bin Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Rack A-1, Dabba #3"
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
              {editingPart ? "Save Karein" : "Stock Mein Add Karein"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Nayi Purchase Batch (Rule 1) */}
      <Modal
        isOpen={isNewBatchModalOpen}
        onClose={() => setIsNewBatchModalOpen(false)}
        title="Nayi Purchase Batch (Buy Stock)"
        description="Har purchase par Nayi Batch Entry banti hai (Purani batch update/delete nahi hoti)"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitNewBatch} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Item (Part) *
            </label>
            <select
              value={batchForm.partId}
              onChange={(e) => {
                const selected = parts.find((p) => p.id === e.target.value);
                setBatchForm({
                  ...batchForm,
                  partId: e.target.value,
                  costPrice: selected ? selected.purchasePrice : batchForm.costPrice,
                  supplier: selected ? selected.supplierName : batchForm.supplier,
                });
              }}
              required
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Item Select Karein --</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock: {p.currentStock})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Purchase Quantity (Tadad) *"
              type="number"
              required
              min="1"
              value={batchForm.qtyPurchased}
              onChange={(e) =>
                setBatchForm({ ...batchForm, qtyPurchased: Number(e.target.value) || 0 })
              }
            />

            <Input
              label="Cost Price / Nayi Kharid (Rs) *"
              type="number"
              required
              min="0"
              value={batchForm.costPrice}
              onChange={(e) =>
                setBatchForm({ ...batchForm, costPrice: Number(e.target.value) || 0 })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label={isUrdu ? "نئی فروخت قیمت (اختیاری)" : "Nayi Bikri Qeemat (Optional)"}
              type="number"
              min="0"
              value={batchForm.sellingPrice === 0 ? "" : batchForm.sellingPrice}
              onChange={(e) =>
                setBatchForm({ ...batchForm, sellingPrice: Number(e.target.value) || 0 })
              }
              placeholder="0 (Khali chorr sakte hain)"
            />

            <Input
              label="Purchase Date *"
              type="date"
              required
              value={batchForm.purchaseDate}
              onChange={(e) => setBatchForm({ ...batchForm, purchaseDate: e.target.value })}
            />
          </div>

          {/* Price & Profit Comparison Preview Box */}
          {(() => {
            const selected = parts.find((p) => p.id === batchForm.partId);
            if (!selected) return null;
            const newMargin = Number(batchForm.sellingPrice) - Number(batchForm.costPrice);
            const oldMargin = selected.sellingPrice - selected.purchasePrice;
            return (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Purana Rate: {formatPKR(selected.purchasePrice)} Kharid / {formatPKR(selected.sellingPrice)} Bikri</span>
                  <span className="text-slate-500 font-semibold">(Munafa: +{formatPKR(oldMargin)})</span>
                </div>
                <div className="flex items-center justify-between font-extrabold text-blue-900 border-t border-blue-100 pt-1">
                  <span>Naya Rate: {formatPKR(Number(batchForm.costPrice) || 0)} Kharid / {formatPKR(Number(batchForm.sellingPrice) || 0)} Bikri</span>
                  <span className={newMargin >= 0 ? "text-emerald-700 font-black" : "text-rose-700 font-black"}>
                    Naya Munafa: {newMargin >= 0 ? "+" : ""}{formatPKR(newMargin)} per unit
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Supplier Name *"
              required
              value={batchForm.supplier}
              onChange={(e) => setBatchForm({ ...batchForm, supplier: e.target.value })}
              placeholder="e.g. Akbar Autos Saddar"
            />

            <Input
              label="Notes / Invoice Ref (Optional)"
              value={batchForm.notes}
              onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
              placeholder="e.g. Invoice # 8291, Cash Purchase"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsNewBatchModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="bg-emerald-600 hover:bg-emerald-700 font-bold">
              Save Purchase Batch
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Purchase Rate History & Change Highlighting (Rule 6) */}
      <Modal
        isOpen={isRateHistoryModalOpen}
        onClose={() => setIsRateHistoryModalOpen(false)}
        title="ريٹ ہسٹری (Purchase Rate History Report)"
        description="Har item ke purchase rates date-wise check karein aur price changes highlight hote hain"
        maxWidth="5xl"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">Filter Item:</span>
            <select
              value={selectedRatePartId}
              onChange={async (e) => {
                const pId = e.target.value;
                setSelectedRatePartId(pId);
                const history = await getPurchaseRateHistory(pId === "All" ? undefined : pId);
                setRateHistoryList(history);
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
            >
              <option value="All">All Items (Sab Parts)</option>
              {Array.from(new Map(parts.map((p) => [p.name.trim().toLowerCase(), p])).values()).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[500px] overflow-y-auto overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 font-bold text-slate-700 sticky top-0 z-10">
                <tr className="border-b border-slate-200">
                  <th className="py-3 px-3.5 whitespace-nowrap">Date</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Item Name</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Supplier</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Cost Price</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap min-w-[200px]">Rate Change (Highlight)</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Qty Purchased</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Qty Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rateHistoryList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                      Koi rate history record nahi mila.
                    </td>
                  </tr>
                ) : (
                  rateHistoryList.map((entry) => {
                    const hasChange = entry.priceChange !== undefined && entry.priceChange !== 0;
                    const isIncrease = entry.priceChange && entry.priceChange > 0;

                    return (
                      <tr
                        key={entry.batchId}
                        className={hasChange ? (isIncrease ? "bg-amber-50/70" : "bg-emerald-50/70") : "hover:bg-slate-50"}
                      >
                        <td className="py-3 px-3.5 font-semibold text-slate-700 whitespace-nowrap">
                          {formatDate(entry.purchaseDate)}
                        </td>
                        <td className="py-3 px-3.5 font-extrabold text-slate-900">
                          {entry.partName}
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                          {entry.supplier}
                        </td>
                        <td className="py-3 px-3.5 text-right font-black text-slate-900 whitespace-nowrap">
                          {formatPKR(entry.costPrice)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {hasChange ? (
                            <Badge
                              variant={isIncrease ? "warning" : "success"}
                              className="font-bold text-xs px-2.5 py-1 inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                            >
                              {isIncrease ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                              <span>
                                {entry.previousCostPrice} se {entry.costPrice} hua ({isIncrease ? "+" : ""}
                                {entry.priceChange} Rs)
                              </span>
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Same Rate</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right text-slate-700 font-bold whitespace-nowrap">
                          {entry.qtyPurchased}
                        </td>
                        <td className="py-3 px-3.5 text-right text-blue-700 font-black whitespace-nowrap">
                          {entry.qtyRemaining}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: Purchase Return & Stock Adjustment (Rule 7) */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Purchase Return / Stock Adjustment"
        description="Galat entry edit karne ke bajaye Return ya Adjustment entry banayein. Batch delete nahi hota!"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitReturn} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 p-2 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setReturnForm({ ...returnForm, type: "purchase_return" })}
              className={`py-2 rounded-lg text-xs font-bold transition ${
                returnForm.type === "purchase_return" ? "bg-white text-amber-900 shadow-xs" : "text-slate-600"
              }`}
            >
              Purchase Return (Supplier Ko Wapas)
            </button>
            <button
              type="button"
              onClick={() => setReturnForm({ ...returnForm, type: "adjustment" })}
              className={`py-2 rounded-lg text-xs font-bold transition ${
                returnForm.type === "adjustment" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
              }`}
            >
              Stock Adjustment (Kharabi / Waste)
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Part *
            </label>
            <select
              value={returnForm.partId}
              onChange={(e) => {
                const target = parts.find((p) => p.id === e.target.value);
                setReturnForm({
                  ...returnForm,
                  partId: e.target.value,
                  supplier: target ? target.supplierName : returnForm.supplier,
                });
              }}
              required
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
            >
              <option value="">-- Select Item --</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Current Stock: {p.currentStock})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="Return / Adjustment Quantity *"
              type="number"
              required
              min="1"
              value={returnForm.quantity}
              onChange={(e) =>
                setReturnForm({ ...returnForm, quantity: Number(e.target.value) || 1 })
              }
            />

            <Input
              label="Supplier Name"
              value={returnForm.supplier}
              onChange={(e) => setReturnForm({ ...returnForm, supplier: e.target.value })}
              placeholder="e.g. Akbar Autos Saddar"
            />
          </div>

          <Input
            label="Reason / Wajah *"
            required
            value={returnForm.reason}
            onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
            placeholder="e.g. Defective piece wapas kiya / Physical audit discrepancy"
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsReturnModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="bg-amber-600 hover:bg-amber-700 font-bold">
              Record Entry
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: Item FIFO Batches Inspector */}
      {viewingPartBatches && (
        <Modal
          isOpen={Boolean(viewingPartBatches)}
          onClose={() => setViewingPartBatches(null)}
          title={`FIFO Batches: ${viewingPartBatches.name}`}
          description={`Is item ki sab purchase batches detail (Total Stock: ${viewingPartBatches.currentStock})`}
          maxWidth="xl"
        >
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
              Sale hone par software sabse purani batch (Rule 2: FIFO) se maal automatically kaatega.
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-bold text-slate-600">
                  <tr className="border-b border-slate-200">
                    <th className="py-2.5 px-3">Batch ID</th>
                    <th className="py-2.5 px-3">Purchase Date</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3 text-right">Cost Price</th>
                    <th className="py-2.5 px-3 text-right">Purchased</th>
                    <th className="py-2.5 px-3 text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeBatches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Is item ki koi purchase batch maujood nahi. Nayi batch add karein!
                      </td>
                    </tr>
                  ) : (
                    activeBatches.map((b) => (
                      <tr key={b.id} className={b.qtyRemaining > 0 ? "hover:bg-slate-50" : "bg-slate-50/50 opacity-60"}>
                        <td className="py-2 px-3 font-mono text-[10px] text-slate-500">{b.id}</td>
                        <td className="py-2 px-3 font-semibold text-slate-700">{formatDate(b.purchaseDate)}</td>
                        <td className="py-2 px-3 text-slate-600">{b.supplier}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{formatPKR(b.costPrice)}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{b.qtyPurchased}</td>
                        <td className="py-2 px-3 text-right font-black text-blue-700">{b.qtyRemaining}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
