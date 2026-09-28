"use client";

import React, { useState } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Bike,
  Receipt,
  ShoppingCart,
  Percent,
  ChevronDown,
  ChevronUp,
  X,
  CreditCard,
  Phone,
  Tag,
  Wrench,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import { useStore } from "@/lib/storage/context";
import { useLanguage } from "@/lib/i18n/context";
import { Part, Customer, Bill, BillItem, BillLabourItem } from "@/types";
import { formatPKR } from "@/lib/utils";

export default function BillingPage() {
  const { parts, customers, mechanics, createBill, addCustomer } = useStore();
  const { t, isUrdu } = useLanguage();

  // Mobile Tab View: 'catalog' or 'cart'
  const [mobileTab, setMobileTab] = useState<"catalog" | "cart">("catalog");

  // Search & Filters
  const [partSearch, setPartSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Cart State (Parts)
  const [cart, setCart] = useState<BillItem[]>([]);

  // Labour State (Ujrat & Mechanic Commission)
  const [labourCart, setLabourCart] = useState<BillLabourItem[]>([]);
  const [showLabourInput, setShowLabourInput] = useState(false);
  const [labourDesc, setLabourDesc] = useState("");
  const [labourAmount, setLabourAmount] = useState<number | "">("");
  const [labourMechanicId, setLabourMechanicId] = useState("");
  const [labourShopCut, setLabourShopCut] = useState<number>(30);
  const [labourError, setLabourError] = useState("");

  // Customer Details (Collapsed by default for zero-clutter fast sales)
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [bikeRegNumber, setBikeRegNumber] = useState<string>("");
  const [bikeModel, setBikeModel] = useState<string>("Honda CD 70");
  const [customerAddress, setCustomerAddress] = useState<string>("");
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);

  // Billing Totals State
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<
    "Cash" | "EasyPaisa / JazzCash" | "Bank Transfer" | "Udhaar / Credit"
  >("Cash");
  const [notes, setNotes] = useState<string>("");

  // Feedback & Receipt Modal
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successBill, setSuccessBill] = useState<Bill | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Select Existing Customer
  const handleSelectCustomer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    setSelectedCustomerId(custId);
    if (!custId) {
      setCustomerName("Walk-in Customer");
      setCustomerPhone("");
      setBikeRegNumber("");
      setBikeModel("Honda CD 70");
      setCustomerAddress("");
      return;
    }
    const cust = customers.find((c) => c.id === custId);
    if (cust) {
      setCustomerName(cust.name);
      setCustomerPhone(cust.phone);
      setBikeRegNumber(cust.bikeRegNumber || "");
      setBikeModel(cust.bikeModel || "Honda CD 70");
      setCustomerAddress(cust.address || "");
    }
  };

  // Add Part to Cart
  const handleAddToCart = (part: Part) => {
    setErrorMessage("");
    if (part.currentStock <= 0) {
      setErrorMessage(`"${part.name}" ka stock khatam hai!`);
      return;
    }

    const existingIndex = cart.findIndex((item) => item.partId === part.id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + 1 > part.currentStock) {
        setErrorMessage(
          `Dukan mein sirf ${part.currentStock} units maujood hain!`
        );
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      updatedCart[existingIndex].totalPrice =
        updatedCart[existingIndex].quantity * updatedCart[existingIndex].unitPrice;
      setCart(updatedCart);
    } else {
      const newItem: BillItem = {
        partId: part.id,
        partName: part.name,
        category: part.category,
        quantity: 1,
        unitPrice: part.sellingPrice,
        purchasePrice: part.purchasePrice,
        totalPrice: part.sellingPrice,
      };
      setCart([...cart, newItem]);
    }
  };

  // Update Cart Quantity
  const handleUpdateQuantity = (partId: string, delta: number) => {
    setErrorMessage("");
    const part = parts.find((p) => p.id === partId);
    const existingIndex = cart.findIndex((item) => item.partId === partId);
    if (existingIndex === -1 || !part) return;

    const newQty = cart[existingIndex].quantity + delta;
    if (newQty <= 0) {
      handleRemoveItem(partId);
      return;
    }

    if (newQty > part.currentStock) {
      setErrorMessage(
        `Sirf ${part.currentStock} units stock mein maujood hain!`
      );
      return;
    }

    const updated = [...cart];
    updated[existingIndex].quantity = newQty;
    updated[existingIndex].totalPrice = newQty * updated[existingIndex].unitPrice;
    setCart(updated);
  };

  // Remove Item
  const handleRemoveItem = (partId: string) => {
    setCart(cart.filter((item) => item.partId !== partId));
  };

  // Labour Handlers
  const handleAddLabourToCart = () => {
    setLabourError("");
    if (!labourDesc.trim()) {
      setLabourError("Kaam / Service ki tafseel likhein (e.g. Engine Tuning).");
      return;
    }
    const amt = Number(labourAmount);
    if (!amt || amt <= 0) {
      setLabourError("Labour charges (mublagh) darj karein.");
      return;
    }

    const mech = mechanics.find((m) => m.id === labourMechanicId);
    const mechName = mech ? mech.name : "Workshop Mechanic";
    const shopCut = Number(labourShopCut) || 0;
    const shopShare = Math.round((amt * shopCut) / 100);
    const mechanicShare = amt - shopShare;

    const newLabour: BillLabourItem = {
      id: `lbr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: labourDesc.trim(),
      amount: amt,
      mechanicId: labourMechanicId || undefined,
      mechanicName: mechName,
      shopCutPercentage: shopCut,
      shopShare,
      mechanicShare,
    };

    setLabourCart([...labourCart, newLabour]);
    setLabourDesc("");
    setLabourAmount("");
    setShowLabourInput(false);
  };

  const handleRemoveLabourFromCart = (id: string) => {
    setLabourCart(labourCart.filter((item) => item.id !== id));
  };

  // Calculations
  const partsSubtotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);
  const labourSubtotal = labourCart.reduce((acc, item) => acc + item.amount, 0);
  const subtotal = partsSubtotal + labourSubtotal;
  const totalItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const grandTotal = Math.max(0, subtotal - (Number(discount) || 0));

  // Save Bill
  const handleCompleteBill = async () => {
    setErrorMessage("");
    if (cart.length === 0 && labourCart.length === 0) {
      setErrorMessage("Khaali bill save nahi ho sakta! Baraye meharbani pehle saman ya labour add karein.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createBill({
        customerId: selectedCustomerId || undefined,
        customerName: customerName || "Walk-in Customer",
        customerPhone: customerPhone || undefined,
        bikeRegNumber: bikeRegNumber || undefined,
        bikeModel: bikeModel || undefined,
        customerAddress: customerAddress || undefined,
        items: cart,
        labourItems: labourCart,
        labourTotal: labourSubtotal,
        partsTotal: partsSubtotal,
        subtotal,
        discount: Number(discount) || 0,
        tax: 0,
        grandTotal,
        paidAmount: grandTotal,
        paymentMethod,
        notes: notes || undefined,
      });

      // Open print receipt modal
      setSuccessBill(created);
      setIsReceiptModalOpen(true);

      // Reset cart
      setCart([]);
      setLabourCart([]);
      setDiscount(0);
      setNotes("");
      setShowCustomerDetails(false);
      setSelectedCustomerId("");
      setCustomerName("Walk-in Customer");
      setCustomerPhone("");
      setBikeRegNumber("");
      setMobileTab("catalog");
    } catch (err: any) {
      setErrorMessage(err.message || "Bill banane mein masla aaya.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Parts Catalog
  const filteredParts = parts.filter((part) => {
    const s = partSearch.toLowerCase();
    const matchesSearch =
      part.name.toLowerCase().includes(s) ||
      part.category.toLowerCase().includes(s) ||
      part.compatibleModels.some((m) => m.toLowerCase().includes(s)) ||
      (part.sku && part.sku.toLowerCase().includes(s));

    const matchesCategory =
      categoryFilter === "All" || part.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const categories = [
    { label: isUrdu ? "تمام سامان" : "Sab Saman", value: "All" },
    { label: isUrdu ? "انجن و گیئر" : "Engine & Gear", value: "Engine & Transmission" },
    { label: isUrdu ? "بریک و کلچ" : "Brakes & Clutch", value: "Brakes & Clutch" },
    { label: isUrdu ? "بیٹری و لائٹس" : "Battery & Lights", value: "Electrical & Battery" },
    { label: isUrdu ? "باڈی و شیشے" : "Body & Mirrors", value: "Body, Lights & Mirrors" },
    { label: isUrdu ? "شاک و فورک" : "Shock & Fork", value: "Suspension & Fork" },
    { label: isUrdu ? "ٹائر و ٹیوب" : "Tyres & Tubes", value: "Tyres & Tubes" },
    { label: isUrdu ? "چین و گراری" : "Chains & Sprockets", value: "Chains & Sprockets" },
    { label: isUrdu ? "انجن آئل" : "Engine Oil", value: "Oils & Lubricants" },
    { label: isUrdu ? "دیگر اسیسریز" : "Accessories", value: "Accessories & General" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-blue-600" />
            {t.posTitle}
          </h1>
          <p className="text-xs text-slate-500">
            {t.posSubtitle}
          </p>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="lg:hidden flex items-center rounded-xl bg-slate-200/80 p-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setMobileTab("catalog")}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition ${
              mobileTab === "catalog"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600"
            }`}
          >
            🛒 {isUrdu ? "سامان کیٹلاگ" : "Saman Catalog"} ({filteredParts.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("cart")}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              mobileTab === "cart"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600"
            }`}
          >
            <span>🧾 {isUrdu ? "بل پرچی" : "Bill Parchi"}</span>
            {cart.length > 0 && (
              <span className="h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage("")}
            className="text-rose-500 hover:text-rose-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Customer Info Strip (Clean & Non-Intrusive) */}
      <Card className="glass-card border-slate-200/90 shadow-sm">
        <CardContent className="p-3.5 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    Gahak:
                  </span>
                  <span className="text-xs font-extrabold text-blue-700">
                    {customerName}
                  </span>
                  {bikeRegNumber && (
                    <Badge variant="outline" className="text-[10px] py-0 font-mono">
                      {bikeRegNumber} ({bikeModel})
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  {customerPhone ? `Mobile: ${customerPhone}` : "Aam Naqad Bikri (Walk-in Cash Sale)"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setShowCustomerDetails(!showCustomerDetails)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100/80 transition flex items-center gap-1"
              >
                <span>{showCustomerDetails ? "Chupayein" : "+ Gahak / Bike Details"}</span>
                {showCustomerDetails ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Customer Form for Specific Bike / Account Customers */}
          {showCustomerDetails && (
            <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Purana Gahak Chunein
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={handleSelectCustomer}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Aam Gahak (Walk-in)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - {c.bikeModel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Gahak Ka Naam
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Naam likhein"
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0300-XXXXXXX"
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Bike Model & Number Plate
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={bikeModel}
                    onChange={(e) => setBikeModel(e.target.value)}
                    className="w-1/2 h-9 rounded-lg border border-slate-200 bg-white px-1.5 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="Honda CD 70">CD 70</option>
                    <option value="Honda CG 125">CG 125</option>
                    <option value="Honda Pridor 100">Pridor</option>
                    <option value="Yamaha YBR 125">YBR 125</option>
                    <option value="Suzuki GS 150">GS 150</option>
                    <option value="United 70">United 70</option>
                    <option value="Road Prince 70">Road Prince</option>
                    <option value="Other">Other</option>
                  </select>
                  <input
                    type="text"
                    value={bikeRegNumber}
                    onChange={(e) => setBikeRegNumber(e.target.value)}
                    placeholder="KHI-1234"
                    className="w-1/2 h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* LEFT COLUMN: Parts Catalog (Visible if desktop OR mobileTab === 'catalog') */}
        <div
          className={`lg:col-span-7 space-y-4 ${
            mobileTab === "cart" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Search & Category Filter */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                placeholder="Saman ka naam, bike model ya part code likhein (e.g. CD 70 Piston, Brake shoe, Caltex oil)..."
                className="w-full h-11 pl-10 pr-9 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-xs"
              />
              {partSearch && (
                <button
                  type="button"
                  onClick={() => setPartSearch("")}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Quick Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg font-bold transition text-xs ${
                    categoryFilter === cat.value
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Parts List */}
          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {filteredParts.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs">
                Koi saman nahi mila. Spelling check karein ya search filter hataein.
              </div>
            ) : (
              filteredParts.map((part) => {
                const isOutOfStock = part.currentStock <= 0;
                const isLowStock =
                  part.currentStock > 0 && part.currentStock <= part.minStockLimit;

                return (
                  <div
                    key={part.id}
                    className={`p-3 sm:p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                      isOutOfStock
                        ? "bg-slate-50/70 border-slate-200 opacity-60"
                        : "bg-white border-slate-200/90 hover:border-blue-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">
                          {part.name}
                        </span>
                        {part.sku && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            #{part.sku}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                        <span className="text-blue-700 font-semibold">
                          {part.compatibleModels.slice(0, 2).join(", ")}
                        </span>
                        <span>•</span>
                        {isOutOfStock ? (
                          <Badge variant="danger" className="text-[10px] py-0 font-bold">
                            Stock Khatam
                          </Badge>
                        ) : isLowStock ? (
                          <Badge variant="warning" className="text-[10px] py-0 font-bold">
                            Sirf {part.currentStock} Baqi
                          </Badge>
                        ) : (
                          <span className="text-emerald-700 font-bold">
                            Stock: {part.currentStock}
                          </span>
                        )}
                        {part.location && (
                          <span className="text-slate-400">({part.location})</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="font-black text-sm sm:text-base text-slate-900">
                          {formatPKR(part.sellingPrice)}
                        </div>
                        <div className="text-[10px] text-slate-400">fee nag</div>
                      </div>

                      {(() => {
                        const inCartItem = cart.find((item) => item.partId === part.id);
                        if (inCartItem) {
                          return (
                            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 p-1 rounded-xl shadow-xs">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(part.id, -1)}
                                className="h-7 w-7 rounded-lg bg-white text-emerald-800 font-bold flex items-center justify-center hover:bg-emerald-100 active:scale-95 shadow-xs"
                                title="1 kam karein"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-6 text-center text-xs font-black text-emerald-900">
                                {inCartItem.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(part.id, 1)}
                                className="h-7 w-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center hover:bg-emerald-700 active:scale-95 shadow-xs"
                                title="1 barhayein"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <Button
                            size="sm"
                            disabled={isOutOfStock}
                            onClick={() => handleAddToCart(part)}
                            className={`h-9 px-3.5 font-bold text-xs shadow-xs ${
                              isOutOfStock
                                ? "bg-slate-200 text-slate-400"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            <span>Add</span>
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Bill Cart (Visible if desktop OR mobileTab === 'cart') */}
        <div
          className={`lg:col-span-5 space-y-4 ${
            mobileTab === "catalog" ? "hidden lg:block" : "block"
          }`}
        >
          <Card className="glass-card shadow-md border-slate-200/90 sticky top-20">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-blue-600" />
                  Maujooda Bill (Cart)
                </CardTitle>
                <div className="text-[11px] text-slate-500 font-medium">
                  {cart.length} types ka saman • {totalItemCount} pieces
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition"
                >
                  Khaali Karein
                </button>
              )}
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Item List (Parts) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>Saman (Parts):</span>
                  <span>{cart.length} Items</span>
                </div>

                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                  {cart.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                      Koi saman shamil nahi
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.partId}
                        className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-xs text-slate-900 truncate">
                            {item.partName}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {formatPKR(item.unitPrice)} fee nag
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.partId, -1)}
                            className="h-6 w-6 rounded bg-white text-slate-700 font-bold flex items-center justify-center hover:bg-slate-200 shadow-xs"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.partId, 1)}
                            className="h-6 w-6 rounded bg-white text-slate-700 font-bold flex items-center justify-center hover:bg-slate-200 shadow-xs"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="text-right min-w-[70px]">
                          <div className="font-black text-xs text-slate-900">
                            {formatPKR(item.totalPrice)}
                          </div>
                        </div>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.partId)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Labour / Ujrat Section */}
              <div className="pt-2 border-t border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                    <Wrench className="h-3.5 w-3.5" />
                    <span>Labour / Ujrat (مزدوری):</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowLabourInput(!showLabourInput);
                      if (!labourMechanicId && mechanics.length > 0) {
                        setLabourMechanicId(mechanics[0].id);
                        setLabourShopCut(mechanics[0].defaultShopCutPercentage);
                      }
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200 transition flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    {showLabourInput ? "Band Karein" : "+ Labour Shamil Karein"}
                  </button>
                </div>

                {/* Inline Labour Addition Form */}
                {showLabourInput && (
                  <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2.5 animate-in fade-in duration-150 text-xs">
                    {labourError && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
                        {labourError}
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                        Kaam / Service Ka Naam *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Engine Tuning, Oil Change, Clutch Plate Fitting..."
                        value={labourDesc}
                        onChange={(e) => setLabourDesc(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      {/* Fast chips */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {["Engine Tuning", "Oil Change", "Brake Setting", "Chain Sprocket", "Full Wiring"].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setLabourDesc(preset)}
                            className="px-2 py-0.5 rounded bg-white text-[10px] font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                          Labour Amount (Rs.) *
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 500"
                          value={labourAmount}
                          onChange={(e) => setLabourAmount(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full h-8 px-2 text-xs font-bold bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                          Shop Malik % *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={labourShopCut}
                            onChange={(e) => setLabourShopCut(Number(e.target.value))}
                            className="w-full h-8 pl-2 pr-6 text-xs font-bold bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <span className="absolute right-2 top-1.5 text-slate-400 text-xs font-bold">%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-indigo-950 mb-1">
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
                        className="w-full h-8 px-2 text-xs bg-white border border-indigo-200 rounded-lg font-bold text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {mechanics.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.defaultShopCutPercentage}% default shop)
                          </option>
                        ))}
                      </select>
                    </div>

                    {Number(labourAmount) > 0 && (
                      <div className="p-2 rounded-lg bg-white/80 border border-indigo-200 text-[10px] space-y-0.5">
                        <div className="flex justify-between text-indigo-900 font-semibold">
                          <span>Shop Cut ({labourShopCut}%):</span>
                          <span>Rs. {Math.round((Number(labourAmount) * labourShopCut) / 100)}</span>
                        </div>
                        <div className="flex justify-between text-indigo-950 font-bold">
                          <span>Mechanic Share ({100 - labourShopCut}%):</span>
                          <span>Rs. {Number(labourAmount) - Math.round((Number(labourAmount) * labourShopCut) / 100)}</span>
                        </div>
                      </div>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddLabourToCart}
                      className="w-full h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Labour Bill Mein Shamil Karein
                    </Button>
                  </div>
                )}

                {/* List of Added Labour Items */}
                <div className="space-y-1.5">
                  {labourCart.map((lbr) => (
                    <div
                      key={lbr.id}
                      className="p-2 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-indigo-950 truncate">{lbr.description}</div>
                        <div className="text-[10px] text-slate-500">
                          Ustad: {lbr.mechanicName} • Shop: {lbr.shopCutPercentage}% (Rs. {lbr.shopShare})
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-black text-indigo-900 text-xs">
                          Rs. {lbr.amount}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLabourFromCart(lbr.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill Totals & Payment Section */}
              {(cart.length > 0 || labourCart.length > 0) && (
                <div className="pt-3 border-t border-slate-200/90 space-y-2.5">
                  {/* Itemized Subtotals */}
                  <div className="space-y-1 text-xs">
                    {cart.length > 0 && (
                      <div className="flex justify-between items-center text-slate-500 text-[11px]">
                        <span>Saman (Parts Subtotal):</span>
                        <span className="font-bold text-slate-700">{formatPKR(partsSubtotal)}</span>
                      </div>
                    )}
                    {labourCart.length > 0 && (
                      <div className="flex justify-between items-center text-indigo-600 text-[11px]">
                        <span>Labour (Ujrat Subtotal):</span>
                        <span className="font-bold text-indigo-800">{formatPKR(labourSubtotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center font-bold text-slate-700 pt-1 border-t border-slate-100">
                      <span>Kul Raqam (Subtotal):</span>
                      <span className="font-black text-slate-900">{formatPKR(subtotal)}</span>
                    </div>
                  </div>

                  {/* Discount / Choot */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-600">
                      Choot / Discount (Rs):
                    </span>
                    <div className="w-28">
                      <input
                        type="number"
                        min="0"
                        value={discount === 0 ? "" : discount}
                        onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full h-8 px-2 text-right rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Paise Kaise Liye (Payment Method):
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      {[
                        { label: "💵 Naqad (Cash)", val: "Cash" },
                        { label: "📱 EasyPaisa/Jazz", val: "EasyPaisa / JazzCash" },
                        { label: "🏦 Bank Transfer", val: "Bank Transfer" },
                        { label: "📝 Udhaar (Credit)", val: "Udhaar / Credit" },
                      ].map((m) => (
                        <button
                          key={m.val}
                          type="button"
                          onClick={() => setPaymentMethod(m.val as any)}
                          className={`p-2 rounded-lg font-bold text-left transition ${
                            paymentMethod === m.val
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grand Total Bar */}
                  <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Net Total Raqam
                      </div>
                      <div className="text-xs text-slate-300">
                        {cart.length} parts • {labourCart.length} services
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-400">
                      {formatPKR(grandTotal)}
                    </div>
                  </div>

                  {/* Submit / Print Bill Button */}
                  <Button
                    size="lg"
                    disabled={isSubmitting || (cart.length === 0 && labourCart.length === 0)}
                    onClick={handleCompleteBill}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-md shadow-blue-600/30 transition flex items-center justify-center gap-2"
                  >
                    <Printer className="h-5 w-5" />
                    <span>{isSubmitting ? "Bill Ban Raha Hai..." : "Bill Banayein & Parchi Print Karein"}</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Bottom Bar for Mobile when items or labour are in cart */}
      {(cart.length > 0 || labourCart.length > 0) && mobileTab === "catalog" && (
        <div className="lg:hidden fixed bottom-16 inset-x-3 z-30 animate-in slide-in-from-bottom-3 duration-200">
          <div
            onClick={() => setMobileTab("cart")}
            className="p-3 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center justify-between cursor-pointer border border-slate-700"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                {cart.length + labourCart.length}
              </div>
              <div>
                <div className="text-xs font-extrabold">{formatPKR(grandTotal)}</div>
                <div className="text-[10px] text-slate-400">{totalItemCount} pieces in bill</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 px-3 py-1.5 rounded-xl">
              <span>Bill Dekhein</span>
              <Receipt className="h-4 w-4" />
            </div>
          </div>
        </div>
      )}

      {/* Print Receipt Modal */}
      <ReceiptModal
        bill={successBill}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />
    </div>
  );
}
