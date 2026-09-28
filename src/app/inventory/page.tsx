"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useStore } from "@/lib/storage/context";
import { useLanguage } from "@/lib/i18n/context";
import { Part, PartCategory } from "@/types";
import { formatPKR, formatDate } from "@/lib/utils";

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
  const { parts, addPart, updatePart, deletePart, updateStock } = useStore();
  const { t, isUrdu } = useLanguage();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [stockStatusFilter, setStockStatusFilter] = useState<"All" | "Low" | "Out">("All");

  // Add / Edit Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);

  // Form State
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
      compatibleModels: part.compatibleModels.join(", "),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const models = formData.compatibleModels
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    if (editingPart) {
      await updatePart(editingPart.id, {
        name: formData.name,
        category: formData.category,
        sku: formData.sku || undefined,
        compatibleModels: models,
        purchasePrice: Number(formData.purchasePrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        currentStock: Number(formData.currentStock) || 0,
        minStockLimit: Number(formData.minStockLimit) || 0,
        supplierName: formData.supplierName,
        supplierPhone: formData.supplierPhone || undefined,
        location: formData.location || undefined,
      });
    } else {
      await addPart({
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
      });
    }
    setIsAddModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Kya aap waqai "${name}" ko stock list se delete karna chahte hain?`)) {
      await deletePart(id);
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
      part.compatibleModels.some((m) => m.toLowerCase().includes(s));

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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="h-6 w-6 text-blue-600" />
            {t.inventoryTitle}
          </h1>
          <p className="text-xs text-slate-500">
            {t.inventorySubtitle}
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 text-xs sm:text-sm h-11"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          + {t.addNewPart}
        </Button>
      </div>

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
            {/* Search Input */}
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

            {/* Category Select */}
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

            {/* Status Tabs */}
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

      {/* Responsive View: Mobile Cards & Desktop Clean Table */}
      {/* 1. Mobile Cards View (Visible on phones & small tablets) */}
      <div className="lg:hidden space-y-3">
        {filteredParts.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs">
            Koi saman nahi mila.
          </div>
        ) : (
          filteredParts.map((part) => {
            const isZero = part.currentStock === 0;
            const isLow =
              part.currentStock > 0 && part.currentStock <= part.minStockLimit;
            const profit = part.sellingPrice - part.purchasePrice;

            return (
              <div
                key={part.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                      {part.name}
                    </h3>
                    <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
                      {part.compatibleModels.join(", ")}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {part.category} {part.location ? `• Shelf: ${part.location}` : ""}
                    </div>
                  </div>

                  <Badge
                    variant={isZero ? "danger" : isLow ? "warning" : "success"}
                    className="text-[10px] py-0 font-bold"
                  >
                    {isZero ? "Khatam" : isLow ? "Kam Stock" : "In Stock"}
                  </Badge>
                </div>

                {/* Prices & Stock Controls */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">
                      Bikri Qeemat (Sale)
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {formatPKR(part.sellingPrice)}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">
                      +{formatPKR(profit)} munafa
                    </div>
                  </div>

                  {/* Quantity +/- Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateStock(part.id, -1)}
                      className="h-8 w-8 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 active:scale-95"
                      title="1 kam karein"
                    >
                      <MinusCircle className="h-4 w-4" />
                    </button>
                    <div className="text-center min-w-[32px]">
                      <div className="font-black text-base text-slate-900 leading-none">
                        {part.currentStock}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Hadd: {part.minStockLimit}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateStock(part.id, 1)}
                      className="h-8 w-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center hover:bg-blue-700 active:scale-95 shadow-xs"
                      title="1 barhayein"
                    >
                      <PlusCircle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStock(part.id, 5)}
                      className="h-8 px-2 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs hover:bg-blue-50 hover:text-blue-700 active:scale-95 transition"
                      title="5 barhayein"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStock(part.id, 10)}
                      className="h-8 px-2 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs hover:bg-blue-50 hover:text-blue-700 active:scale-95 transition"
                      title="10 barhayein"
                    >
                      +10
                    </button>
                  </div>
                </div>

                {/* Footer with Supplier & Actions */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="text-[11px] text-slate-500 truncate">
                    Supplier: <span className="font-semibold text-slate-700">{part.supplierName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(part)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 text-xs font-bold transition flex items-center gap-1"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(part.id, part.name)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition"
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
                <th className="py-3 px-4">Saman Ka Naam & Bike</th>
                <th className="py-3 px-3">Category / Shelf</th>
                <th className="py-3 px-3 text-right">Kharid (Cost)</th>
                <th className="py-3 px-3 text-right">Bikri (Sale)</th>
                <th className="py-3 px-3 text-center">Maujooda Stock</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-4 text-right">Tabdeeli (Action)</th>
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
                  const isLow =
                    part.currentStock > 0 && part.currentStock <= part.minStockLimit;
                  const margin = part.sellingPrice - part.purchasePrice;

                  return (
                    <tr
                      key={part.id}
                      className="hover:bg-slate-50/80 transition group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="font-extrabold text-slate-900 leading-snug">
                          {part.name}
                        </div>
                        <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
                          {part.compatibleModels.join(", ")}
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
                        <div>{formatPKR(part.sellingPrice)}</div>
                        <div className="text-[10px] text-emerald-600 font-semibold">
                          +{formatPKR(margin)} munafa
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateStock(part.id, -1)}
                            className="text-slate-400 hover:text-slate-700 p-0.5"
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
                            onClick={() => updateStock(part.id, 1)}
                            className="text-slate-400 hover:text-slate-700 p-0.5"
                            title="Stock 1 barhayein"
                          >
                            <PlusCircle className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Hadd: {part.minStockLimit}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <Badge
                          variant={isZero ? "danger" : isLow ? "warning" : "success"}
                          className="font-bold text-[10px]"
                        >
                          {isZero ? "Khatam" : isLow ? "Kam Stock" : "In Stock"}
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
                            onClick={() => handleOpenEdit(part)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="Edit Part"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(part.id, part.name)}
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

      {/* Add / Edit Part Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingPart ? "Saman Ki Details Tabdeel Karein" : "Naya Saman Shamil Karein"}
        description="Saman ka naam, model, qeemat aur maujooda tadad darj karein"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Saman Ka Naam (Part Name) *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Atlas Honda Piston 70cc Standard"
          />

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
              label="Kharid Qeemat (Cost PKR) *"
              type="number"
              required
              min="0"
              value={formData.purchasePrice === 0 ? "" : formData.purchasePrice}
              onChange={(e) =>
                setFormData({ ...formData, purchasePrice: Number(e.target.value) || 0 })
              }
              placeholder="0"
            />

            <Input
              label="Bikri Qeemat (Sale Price PKR) *"
              type="number"
              required
              min="0"
              value={formData.sellingPrice === 0 ? "" : formData.sellingPrice}
              onChange={(e) =>
                setFormData({ ...formData, sellingPrice: Number(e.target.value) || 0 })
              }
              placeholder="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="Maujooda Stock (Tadad) *"
              type="number"
              required
              min="0"
              value={formData.currentStock}
              onChange={(e) =>
                setFormData({ ...formData, currentStock: Number(e.target.value) || 0 })
              }
            />

            <Input
              label="Kam Stock Alert Hadd *"
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
              label="Dukan Mein Kahan Rakha Hai (Shelf / Rack)"
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
    </div>
  );
}
