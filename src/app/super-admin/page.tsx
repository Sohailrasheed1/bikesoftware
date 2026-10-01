"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store,
  Users,
  DollarSign,
  AlertCircle,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  KeyRound,
  Edit,
  Trash2,
  ExternalLink,
  RefreshCw,
  LogOut,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Receipt,
  Boxes,
  HelpCircle,
} from "lucide-react";
import { Shop, SaaSStats } from "@/types";
import { useToast } from "@/components/providers/toast-provider";

export default function SuperAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [shops, setShops] = useState<Shop[]>([]);
  const [stats, setStats] = useState<SaaSStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "expired">("all");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Add Shop Form state
  const [addForm, setAddForm] = useState({
    name: "",
    urduName: "",
    ownerName: "",
    phone: "",
    address: "",
    city: "Karachi",
    monthlyRent: "5000",
    subscriptionMonths: "1",
    adminUsername: "",
    adminPassword: "",
    seedSampleParts: true,
    notes: "",
  });

  // Edit Shop Form state
  const [editForm, setEditForm] = useState({
    name: "",
    urduName: "",
    ownerName: "",
    phone: "",
    address: "",
    city: "",
    monthlyRent: 0,
    subscriptionEnd: "",
    status: "active" as "active" | "suspended" | "expired",
    notes: "",
  });

  // Reset Password state
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Check auth
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && (session?.user as any)?.role !== "superadmin") {
      router.replace("/");
    }
  }, [status, session, router]);

  // Load SaaS Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [shopsRes, statsRes] = await Promise.all([
        fetch("/api/super-admin/shops"),
        fetch("/api/super-admin/stats"),
      ]);

      if (shopsRes.ok) {
        const shopsData = await shopsRes.json();
        setShops(shopsData);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("Failed to load SaaS data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Show toast notification via global top-right toaster
  const showToast = (text: string, type: "success" | "error" = "success") => {
    if (type === "error") {
      toast.error("Masla Aaya", text);
    } else {
      toast.success("Kamyabi", text);
    }
  };

  // Create Shop Handler
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const months = parseInt(addForm.subscriptionMonths) || 1;
      const subEndDate = new Date();
      subEndDate.setMonth(subEndDate.getMonth() + months);

      const res = await fetch("/api/super-admin/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name,
          urduName: addForm.urduName || undefined,
          ownerName: addForm.ownerName,
          phone: addForm.phone,
          address: addForm.address,
          city: addForm.city,
          monthlyRent: Number(addForm.monthlyRent) || 0,
          subscriptionEnd: subEndDate.toISOString(),
          adminUsername: addForm.adminUsername,
          adminPassword: addForm.adminPassword,
          seedSampleParts: addForm.seedSampleParts,
          notes: addForm.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dukan banane mein masla aaya.");

      showToast(`Dukan "${addForm.name}" kamyabi se shamil ho gayi!`);
      setShowAddModal(false);
      setAddForm({
        name: "",
        urduName: "",
        ownerName: "",
        phone: "",
        address: "",
        city: "Karachi",
        monthlyRent: "5000",
        subscriptionMonths: "1",
        adminUsername: "",
        adminPassword: "",
        seedSampleParts: true,
        notes: "",
      });
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Shop Status (Active / Suspended)
  const handleToggleStatus = async (shop: Shop) => {
    const nextStatus = shop.status === "active" ? "suspended" : "active";
    const confirmText =
      nextStatus === "suspended"
        ? `Kya aap "${shop.name}" ka software access suspend karna chahte hain? Inke staff ka login block ho jayega.`
        : `Kya aap "${shop.name}" ka software access dobara fa'al (Active) karna chahte hain?`;

    if (!window.confirm(confirmText)) return;

    try {
      const res = await fetch(`/api/super-admin/shops/${shop.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Status update fail ho gaya.");
      showToast(`Dukan status: ${nextStatus.toUpperCase()}`);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Open Edit Modal
  const openEditModal = (shop: Shop) => {
    setSelectedShop(shop);
    setEditForm({
      name: shop.name,
      urduName: shop.urduName || "",
      ownerName: shop.ownerName,
      phone: shop.phone,
      address: shop.address,
      city: shop.city,
      monthlyRent: shop.monthlyRent,
      subscriptionEnd: shop.subscriptionEnd ? shop.subscriptionEnd.split("T")[0] : "",
      status: shop.status,
      notes: shop.notes || "",
    });
    setShowEditModal(true);
  };

  // Save Edit Handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/super-admin/shops/${selectedShop.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          subscriptionEnd: editForm.subscriptionEnd
            ? new Date(editForm.subscriptionEnd).toISOString()
            : selectedShop.subscriptionEnd,
        }),
      });
      if (!res.ok) throw new Error("Update mein masla aaya.");
      showToast(`Dukan "${editForm.name}" update ho gayi!`);
      setShowEditModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Reset Password Modal
  const openResetPasswordModal = (shop: Shop) => {
    setSelectedShop(shop);
    setNewPassword("");
    setShowResetPasswordModal(true);
  };

  // Save Reset Password Handler
  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/super-admin/shops/${selectedShop.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password reset mein masla aaya.");
      showToast(`Naya password set ho gaya: ${newPassword}`);
      setShowResetPasswordModal(false);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (shop: Shop) => {
    setSelectedShop(shop);
    setShowDeleteModal(true);
  };

  // Confirm Delete Handler
  const handleConfirmDelete = async () => {
    if (!selectedShop) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/super-admin/shops/${selectedShop.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete mein masla aaya.");
      showToast(`Dukan "${selectedShop.name}" delete ho gayi.`);
      setShowDeleteModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Shops
  const filteredShops = shops.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      (s.adminUsername && s.adminUsername.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.city.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === "all") return true;
    return s.status === statusFilter;
  });

  // Calculate days remaining for a subscription
  const getSubscriptionInfo = (dateStr: string) => {
    if (!dateStr) return { days: 0, text: "No Expiry", color: "text-slate-500" };
    const end = new Date(dateStr).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { days: diffDays, text: `${Math.abs(diffDays)} din pehle Expire`, color: "text-rose-600 font-bold" };
    }
    if (diffDays <= 7) {
      return { days: diffDays, text: `${diffDays} din baqi (Jald Expire)`, color: "text-amber-600 font-bold" };
    }
    return { days: diffDays, text: `${diffDays} din baqi`, color: "text-emerald-700" };
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                SaaS Super Admin Portal
              </h1>
              <span className="text-[10px] uppercase font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                Multi-Tenant Hub
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Dukanon Ka Hisab, Monthly Rent aur User Control Center
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
          >
            <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
            <span>Open Workshop POS (دکان دیکھیں)</span>
          </Link>

          <button
            onClick={fetchData}
            title="Refresh Data"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
          </button>

          <button
            onClick={async () => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("gilani_autos_offline_session");
                localStorage.removeItem("gilani_autos_logged_in");
              }
              await signOut({ redirect: false });
              window.location.href = "/login";
            }}
            title="Logout"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>



      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {/* Total Shops */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Kul Dukanain (Shops)
              </span>
              <div className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Store className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {stats?.totalShops ?? shops.length}
              </span>
              <span className="text-xs text-slate-400 font-semibold">Registered</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>{stats?.activeShops ?? 0} Fa'al (Active)</span>
            </div>
          </div>

          {/* Monthly Recurring Revenue */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-800/90 to-blue-950/60 border border-blue-500/30 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                Mahana Rent (MRR)
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-xs font-bold text-emerald-400">Rs.</span>
              <span className="text-2xl sm:text-3xl font-black text-white">
                {(stats?.monthlyRecurringRevenue ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-300/80 font-medium">
              Expected recurring rent per month
            </div>
          </div>

          {/* Expiring in 7 Days */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Rent Due (7 Din Baqi)
              </span>
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-400">
                {stats?.expiringIn7Days ?? 0}
              </span>
              <span className="text-xs text-slate-400 font-semibold">Dukanain</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Rent renewal notifications pending
            </div>
          </div>

          {/* Suspended Shops */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Suspended / Mu'attal
              </span>
              <div className="h-8 w-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <XCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-400">
                {stats?.suspendedShops ?? 0}
              </span>
              <span className="text-xs text-slate-400 font-semibold">Locked Access</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Unpaid rent or deactivated clients
            </div>
          </div>
        </div>

        {/* Global Activity Quick Bar */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-blue-400" />
              <strong className="text-slate-200">{(stats?.totalSystemBills ?? 0).toLocaleString()}</strong> Kul Bills
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <strong className="text-slate-200">Rs. {(stats?.totalSystemSales ?? 0).toLocaleString()}</strong> Kul Bikri
            </span>
            <span className="flex items-center gap-1.5">
              <Boxes className="h-3.5 w-3.5 text-purple-400" />
              <strong className="text-slate-200">{(stats?.totalSystemParts ?? 0).toLocaleString()}</strong> Parts Catalog
            </span>
          </div>

          <div className="text-[11px] text-slate-400 italic">
            💡 Dukan walon ko bilkul pata nahi chalta k wo SaaS platform par hain.
          </div>
        </div>

        {/* Action Header & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2 max-w-md relative">
            <Search className="h-4 w-4 absolute left-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Dukan ka naam, malik, mobile ya shehar talash karein..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700 text-xs">
              {(["all", "active", "suspended"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setStatusFilter(mode)}
                  className={`px-3 py-1 rounded-lg font-bold capitalize transition ${
                    statusFilter === mode
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {mode === "all" ? "Tamam" : mode === "active" ? "Fa'al (Active)" : "Suspended"}
                </button>
              ))}
            </div>

            {/* Add Shop Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Nayi Dukan Shamil Karein</span>
            </button>
          </div>
        </div>

        {/* Shops Table / Cards List */}
        <div className="bg-slate-800/60 rounded-3xl border border-slate-700/80 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-700/80 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Store className="h-4 w-4 text-blue-400" />
              <span>Registered Shops Directory ({filteredShops.length})</span>
            </h2>
            <span className="text-[11px] text-slate-400">
              Showing filtered results
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-400 mx-auto" />
              <p className="text-xs font-semibold">Dukanon ka data load ho raha hai...</p>
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Store className="h-10 w-10 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-400">Koi dukan nahi mili.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-xs font-bold text-blue-400 hover:underline"
              >
                + Pehli nayi dukan yahan se banayein
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/60 overflow-x-auto">
              {filteredShops.map((shop) => {
                const subInfo = getSubscriptionInfo(shop.subscriptionEnd);
                const isDefault = shop.id === "shop-sikandar";

                return (
                  <div
                    key={shop.id}
                    className="p-4 sm:p-5 hover:bg-slate-800/90 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Shop Identity */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-xl flex-shrink-0">
                        🏪
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-black text-white truncate">
                            {shop.name}
                          </h3>
                          {shop.urduName && (
                            <span className="text-xs font-bold text-slate-400 font-urdu">
                              ({shop.urduName})
                            </span>
                          )}
                          {isDefault && (
                            <span className="text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                              Primary Flagship
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                              shop.status === "active"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                            }`}
                          >
                            {shop.status === "active" ? "Fa'al (Active)" : "Suspended"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Users className="h-3 w-3 text-slate-500" />
                            <strong>Malik:</strong> {shop.ownerName}
                          </span>
                          {shop.phone && (
                            <a
                              href={`tel:${shop.phone}`}
                              className="flex items-center gap-1 text-blue-400 hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {shop.phone}
                            </a>
                          )}
                          {shop.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-500" />
                              {shop.city}
                            </span>
                          )}
                          {shop.adminUsername && (
                            <span className="flex items-center gap-1 text-amber-300/90 font-mono text-[11px]">
                              <Shield className="h-3 w-3 text-amber-400" />
                              User: <strong>{shop.adminUsername}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Subscription & Rent Details */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 lg:gap-6 bg-slate-900/60 px-4 py-2.5 rounded-2xl border border-slate-700/60 text-xs">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-500">
                          Mahana Rent
                        </div>
                        <div className="font-black text-white text-sm">
                          Rs. {shop.monthlyRent ? shop.monthlyRent.toLocaleString() : "0"}
                          <span className="text-[10px] font-normal text-slate-400"> /mo</span>
                        </div>
                      </div>

                      <div className="h-7 w-px bg-slate-700 hidden sm:block" />

                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-500">
                          Subscription Expiry
                        </div>
                        <div className="font-semibold text-slate-300 text-xs">
                          {shop.subscriptionEnd ? shop.subscriptionEnd.split("T")[0] : "Lifetime"}
                        </div>
                        <div className={`text-[10px] ${subInfo.color}`}>{subInfo.text}</div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Open Shop (Impersonate / View) */}
                      <button
                        onClick={() => {
                          // Allow superadmin to enter the app scoped to this shop
                          window.location.href = `/?shopId=${shop.id}`;
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold transition"
                        title="Enter and view this shop's live database & POS"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Dukan Kholein</span>
                      </button>

                      {/* Suspend / Activate Toggle */}
                      <button
                        onClick={() => handleToggleStatus(shop)}
                        className={`p-2 rounded-xl border text-xs font-bold transition ${
                          shop.status === "active"
                            ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        }`}
                        title={
                          shop.status === "active"
                            ? "Dukan ka software block / suspend karein"
                            : "Dukan ko active karein"
                        }
                      >
                        {shop.status === "active" ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </button>

                      {/* Reset Password */}
                      <button
                        onClick={() => openResetPasswordModal(shop)}
                        className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600/80 transition"
                        title="Shop Admin Password Reset Karein"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>

                      {/* Edit Shop */}
                      <button
                        onClick={() => openEditModal(shop)}
                        className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600/80 transition"
                        title="Edit Shop Details"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      {/* Delete Shop (Only non-default) */}
                      {!isDefault && (
                        <button
                          onClick={() => openDeleteModal(shop)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
                          title="Delete Shop"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* --- MODAL 1: ADD NEW SHOP --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Nayi Dukan Shamil Karein</h3>
                  <p className="text-xs text-slate-400">Add new client shop and generate admin login</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateShop} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Shop Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">
                    Dukan Ka Naam (Shop Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="e.g. Madina Autos & Workshop"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Urdu Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">
                    Urdu Naam (Optional)
                  </label>
                  <input
                    type="text"
                    value={addForm.urduName}
                    onChange={(e) => setAddForm({ ...addForm, urduName: e.target.value })}
                    placeholder="مثلاً: مدینہ آٹوز ورکشاپ"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-urdu text-right focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Owner Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">
                    Malik Ka Naam (Owner Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.ownerName}
                    onChange={(e) => setAddForm({ ...addForm, ownerName: e.target.value })}
                    placeholder="e.g. Haji Muhammad Tariq"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">
                    Mobile / Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="0300-1234567"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* City */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">Shehar (City)</label>
                  <input
                    type="text"
                    value={addForm.city}
                    onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                    placeholder="Karachi, Lahore, etc."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">Pata / Address</label>
                  <input
                    type="text"
                    value={addForm.address}
                    onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                    placeholder="Shop # 5, Main Market"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Login Credentials Box */}
              <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/30 space-y-3">
                <div className="flex items-center gap-2 font-bold text-blue-300">
                  <KeyRound className="h-4 w-4" />
                  <span>Client Login Credentials (Dukan Malik Ka Login)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Username *</label>
                    <input
                      type="text"
                      required
                      value={addForm.adminUsername}
                      onChange={(e) => setAddForm({ ...addForm, adminUsername: e.target.value })}
                      placeholder="e.g. madina_admin"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Password *</label>
                    <input
                      type="text"
                      required
                      value={addForm.adminPassword}
                      onChange={(e) => setAddForm({ ...addForm, adminPassword: e.target.value })}
                      placeholder="e.g. madina123"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & Subscription */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">
                    Mahana Rent (Monthly Rent in PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={addForm.monthlyRent}
                    onChange={(e) => setAddForm({ ...addForm, monthlyRent: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">
                    Initial Subscription Duration
                  </label>
                  <select
                    value={addForm.subscriptionMonths}
                    onChange={(e) => setAddForm({ ...addForm, subscriptionMonths: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="1">1 Mahina (1 Month)</option>
                    <option value="3">3 Mahine (Quarterly)</option>
                    <option value="6">6 Mahine (Half-Yearly)</option>
                    <option value="12">1 Saal (1 Year)</option>
                  </select>
                </div>
              </div>

              {/* Seed Sample Parts Checkbox */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="seedParts"
                  checked={addForm.seedSampleParts}
                  onChange={(e) => setAddForm({ ...addForm, seedSampleParts: e.target.checked })}
                  className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-blue-600 mt-0.5"
                />
                <label htmlFor="seedParts" className="text-xs text-slate-300 select-none cursor-pointer">
                  <strong className="text-white">Motorcycle Sample Catalog khud shamil karein:</strong> CD70, CG125, break shoe, clutch plate aur engine oils pehle se inventory mein dalein ge ta k dukan wala foran billing shuru kar sakay.
                </label>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Mansookh (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition"
                >
                  {actionLoading ? "Shamil ho raha hai..." : "Dukan Shamil Karein"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: EDIT SHOP --- */}
      {showEditModal && selectedShop && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                  <Edit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Dukan Edit Karein</h3>
                  <p className="text-xs text-slate-400">{selectedShop.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">Dukan Ka Naam</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">Malik Ka Naam</label>
                  <input
                    type="text"
                    required
                    value={editForm.ownerName}
                    onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">Mobile Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">Shehar (City)</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">Mahana Rent (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.monthlyRent}
                    onChange={(e) => setEditForm({ ...editForm, monthlyRent: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">Expiry Tareekh</label>
                  <input
                    type="date"
                    value={editForm.subscriptionEnd}
                    onChange={(e) => setEditForm({ ...editForm, subscriptionEnd: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-300 uppercase">Pata / Address</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-300 uppercase">Halat / Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="active">Active (Fa'al - Software Chal Raha Hai)</option>
                    <option value="suspended">Suspended (Mu'attal - Login Blocked)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Mansookh
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 transition"
                >
                  {actionLoading ? "Mehfooz ho raha hai..." : "Mehfooz Karein (Save)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: RESET PASSWORD --- */}
      {showResetPasswordModal && selectedShop && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-black text-white">Reset Shop Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResetPasswordModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Dukan <strong className="text-white">"{selectedShop.name}"</strong> (User:{" "}
              <strong className="text-amber-300 font-mono">{selectedShop.adminUsername}</strong>) ke liye naya password darj karein:
            </p>

            <form onSubmit={handleSaveResetPassword} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 uppercase">Naya Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !newPassword}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold disabled:opacity-50 transition"
                >
                  {actionLoading ? "Reset ho raha hai..." : "Naya Password Set Karein"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: DELETE SHOP --- */}
      {showDeleteModal && selectedShop && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Dukan Delete Karein?</h3>
                <p className="text-xs text-rose-400 font-semibold">Yeh action wapis nahi ho sakta!</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Aap <strong className="text-white">"{selectedShop.name}"</strong> ko delete karne lage hain.
              Is dukan ke tamam accounts, bills, inventory, customers aur job cards hamesha k liye khatam ho jayenge.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition text-xs"
              >
                Nahi, Roko
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 disabled:opacity-50 transition"
              >
                {actionLoading ? "Delete ho raha hai..." : "Haan, Dukan Delete Karein"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
