"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  Eye,
  EyeOff,
  Receipt,
  Bike,
  Boxes,
  UserCheck,
  History,
  WalletCards,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Lock,
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { useLanguage } from "@/lib/i18n/context";
import {
  UserPermissions,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
} from "@/types";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

interface ShopUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  permissions?: UserPermissions;
  createdAt: string;
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export function UserManagementModal({
  isOpen,
  onClose,
  currentUserId,
}: UserManagementModalProps) {
  const { isUrdu } = useLanguage();
  const { toast } = useToast();
  const { isAdmin, isSuperAdmin } = useCurrentUser();
  const [users, setUsers] = useState<ShopUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    role: "staff" as "admin" | "staff",
  });

  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_STAFF_PERMISSIONS);
  const [showPassword, setShowPassword] = useState(false);

  // Fetch Users
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Users fetch karne mein masla aaya");
      const data = await res.json();
      // Ensure superadmin is strictly excluded from shop users list
      const filtered = Array.isArray(data) ? data.filter((u: any) => u.role !== "superadmin") : [];
      setUsers(filtered);
    } catch (err: any) {
      console.error(err);
      toast.error("Error", err.message || "Users load nahi ho sake.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (!isAdmin && !isSuperAdmin) {
        onClose();
        return;
      }
      fetchUsers();
      setShowForm(false);
      resetForm();
    }
  }, [isOpen, isAdmin, isSuperAdmin]);

  const resetForm = () => {
    setIsEditing(false);
    setEditingUserId(null);
    setFormData({
      name: "",
      username: "",
      password: "",
      role: "staff",
    });
    setPermissions(DEFAULT_STAFF_PERMISSIONS);
    setShowPassword(false);
  };

  const handleStartCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const handleStartEdit = (user: ShopUser) => {
    setIsEditing(true);
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      username: user.username,
      password: "", // empty means don't change
      role: (user.role === "admin" ? "admin" : "staff") as "admin" | "staff",
    });
    setPermissions(
      user.permissions || (user.role === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS)
    );
    setShowForm(true);
  };

  const handlePermissionToggle = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleApplyPreset = (preset: "billing_only" | "workshop_inventory" | "full_access" | "no_financials") => {
    if (preset === "billing_only") {
      setPermissions({
        pos: true,
        workshop: false,
        inventory: false,
        customers: true,
        bills: true,
        mechanics: false,
        suppliers: false,
        reports: false,
        viewSalesAndProfit: false,
      });
    } else if (preset === "workshop_inventory") {
      setPermissions({
        pos: true,
        workshop: true,
        inventory: true,
        customers: true,
        bills: true,
        mechanics: true,
        suppliers: false,
        reports: false,
        viewSalesAndProfit: false,
      });
    } else if (preset === "full_access") {
      setPermissions({ ...DEFAULT_ADMIN_PERMISSIONS });
    } else if (preset === "no_financials") {
      setPermissions({
        pos: true,
        workshop: true,
        inventory: true,
        customers: true,
        bills: true,
        mechanics: true,
        suppliers: false,
        reports: false,
        viewSalesAndProfit: false,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.username.trim()) {
      toast.warning("Missing Fields", "Naam aur Username darj karna zaroori hai.");
      return;
    }

    if (!isEditing && (!formData.password || formData.password.length < 8)) {
      toast.warning("Password Required", "Naye user ke liye kam az kam 8 haroof ka password darj karein.");
      return;
    }

    if (isEditing && formData.password && formData.password.length < 8) {
      toast.warning("Password Too Short", "Naya password kam az kam 8 haroof ka hona chahiye.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: formData.name,
        username: formData.username,
        role: formData.role,
        permissions: formData.role === "admin" ? DEFAULT_ADMIN_PERMISSIONS : permissions,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (isEditing && editingUserId) {
        const res = await fetch(`/api/users/${encodeURIComponent(editingUserId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update mein masla aaya");
        toast.success("User Updated", `"${formData.name}" ki permissions update ho gayi hain.`);
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "User create nahi ho saka");
        toast.success("User Created", `Naya account "${formData.username}" bana diya gaya.`);
      }

      await fetchUsers();
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      toast.error("Error", err.message || "Action fail ho gaya.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: ShopUser) => {
    if (user.username === "admin" || user.id === "user-1" || (user.role as string) === "superadmin") {
      toast.error("Not Allowed", "Yeh account delete nahi kiya ja sakta.");
      return;
    }

    const conf = window.confirm(
      isUrdu
        ? `Kya aap waqai "${user.name}" (${user.username}) ko delete karna chahte hain?`
        : `Kya aap waqai user "${user.name}" ko delete karna chahte hain?`
    );
    if (!conf) return;

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(user.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete nahi ho saka");

      // Optimistically remove user from list
      setUsers((prev) => prev.filter((u) => u.id !== user.id && u.username !== user.username));
      toast.success("User Deleted", `"${user.name}" ka account delete kar diya gaya.`);
      await fetchUsers();
      if (editingUserId === user.id) {
        setShowForm(false);
        resetForm();
      }
    } catch (err: any) {
      toast.error("Delete Error", err.message || "User delete nahi ho saka.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isUrdu ? "اسٹاف اور یوزرز کا انتظام و اختیارات" : "Manage Staff, Users & Permissions"}
      description={
        isUrdu
          ? "یہاں سے آپ نئے اسٹاف اکاونٹس بنا سکتے ہیں اور انہیں اپنی مرضی سے اختیارات (Permissions) دے سکتے ہیں۔"
          : "Naye staff accounts banayein, unke passwords set karein aur apni marzi se kisi bhi module ya munafa ka access dein."
      }
      maxWidth="3xl"
    >
      <div className="space-y-5 py-2">
        {/* Top Control Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">
                {isUrdu ? "دکان کے مجاز اکاؤنٹس" : "Active Shop Accounts"}
              </div>
              <div className="text-[11px] text-slate-500">
                {users.length} {isUrdu ? "اکاؤنٹس فعال ہیں" : "Users Registered"}
              </div>
            </div>
          </div>

          {!showForm && (
            <Button
              onClick={handleStartCreate}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              <UserPlus className="h-4 w-4" />
              <span>{isUrdu ? "نیا اسٹاف اکاؤنٹ بنائیں" : "Naya User / Staff Banayein"}</span>
            </Button>
          )}
        </div>

        {/* User Form (Create / Edit) */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-blue-500/30 shadow-md space-y-4 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <h3 className="font-black text-sm text-slate-900">
                  {isEditing
                    ? isUrdu
                      ? "اکاؤنٹ اور اختیارات میں ترمیم"
                      : `Edit User: ${formData.name}`
                    : isUrdu
                    ? "نیا اسٹاف اکاؤنٹ بنائیں"
                    : "Add New Staff Member"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 transition"
              >
                {isUrdu ? "منسوخ کریں" : "Cancel"}
              </button>
            </div>

            {/* Basic Info Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label={isUrdu ? "مکمل نام *" : "Full Name *"}
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Ali Counter Staff"
              />

              <Input
                label={isUrdu ? "لاگ ان یوزرنیم *" : "Login Username *"}
                required
                disabled={isEditing}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="e.g. ali_staff"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isUrdu ? "پاس ورڈ" : "Password"} {isEditing ? "(Khali chorein agar nahi badalna)" : "*"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required={!isEditing}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={isEditing ? "Purana password barkarar rahega (ya kam az kam 8 haroof)" : "Kam az kam 8 characters"}
                    minLength={isEditing && !formData.password ? undefined : 8}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isUrdu ? "اکاؤنٹ کا کردار (Role)" : "Account Role"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "staff" })}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition ${
                      formData.role === "staff"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    👨‍💼 {isUrdu ? "اسٹاف ممبر" : "Staff Member"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "admin" })}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition ${
                      formData.role === "admin"
                        ? "bg-blue-50 border-blue-500 text-blue-800 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    👑 {isUrdu ? "ایڈمن / مینیجر" : "Admin / Malik"}
                  </button>
                </div>
              </div>
            </div>

            {/* Permissions Matrix */}
            {formData.role === "staff" ? (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">
                      {isUrdu ? "اسٹاف کے مجاز اختیارات (Custom Access Control)" : "Staff Access Permissions"}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {isUrdu
                        ? "جن چیزوں پر نشان لگا ہوگا، اسٹاف صرف وہی دیکھ اور چلا سکے گا۔"
                        : "Chuni hui cheezon ka access milega, baqi modules bilkul hide aur band rahenge."}
                    </p>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400">Presets:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("no_financials")}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold rounded-lg border border-amber-200 transition"
                    >
                      🔒 {isUrdu ? "سیل و منافع کے بغیر" : "Safe (No Profit)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("billing_only")}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition"
                    >
                      🧾 {isUrdu ? "صرف بلنگ" : "Billing Only"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("full_access")}
                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200 transition"
                    >
                      ✨ {isUrdu ? "مکمل اختیارات" : "Full Access"}
                    </button>
                  </div>
                </div>

                {/* THE SPECIAL FINANCIAL / PROFIT HIGHLIGHT CARD */}
                <div
                  onClick={() => handlePermissionToggle("viewSalesAndProfit")}
                  className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between gap-3 ${
                    permissions.viewSalesAndProfit
                      ? "bg-amber-50/70 border-amber-400 text-amber-900"
                      : "bg-slate-50 border-slate-300 text-slate-600 hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold ${
                        permissions.viewSalesAndProfit
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black flex items-center gap-1.5">
                        <span>
                          {isUrdu
                            ? "💰 روزانہ کی سیل اور منافع دیکھنا (Sales & Net Profit)"
                            : "💰 Roz Ki Sale & Khalis Munafa Dekhna (Sales & Net Profit)"}
                        </span>
                        {!permissions.viewSalesAndProfit && (
                          <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">
                            {isUrdu ? "بند ہے (محفوظ)" : "Disabled (Protected)"}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        {isUrdu
                          ? "اگر یہ بند ہو تو اسٹاف کو ڈیش بورڈ پر روز کی سیل، خالص منافع اور انوینٹری ویلیو بالکل نظر نہیں آئے گی۔"
                          : "Band hone par staff ko dashboard par aaj ki sale, khalis munafa aur dukaan ki kamai nazar nahi aayegi."}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissions.viewSalesAndProfit}
                    onChange={() => {}}
                    className="h-5 w-5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer flex-shrink-0"
                  />
                </div>

                {/* Grid of Other Permissions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* POS */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                    <div className="flex items-center gap-2.5">
                      <Receipt className="h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {isUrdu ? "نیا بل بنانا (Fast POS)" : "Fast POS & Billing"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isUrdu ? "کاؤنٹر پر فوری بل اور پرنٹ" : "Counter sales & print invoice"}
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.pos}
                      onChange={() => handlePermissionToggle("pos")}
                      className="h-4 w-4 rounded text-blue-600 cursor-pointer"
                    />
                  </label>

                  {/* Workshop */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                    <div className="flex items-center gap-2.5">
                      <Bike className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {isUrdu ? "ورکشاپ بے (Live Bay)" : "Live Workshop Bay"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isUrdu ? "گاڑیوں کا کام و جاب کارڈ" : "Service bays & job tracking"}
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.workshop}
                      onChange={() => handlePermissionToggle("workshop")}
                      className="h-4 w-4 rounded text-blue-600 cursor-pointer"
                    />
                  </label>

                  {/* Inventory */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                    <div className="flex items-center gap-2.5">
                      <Boxes className="h-4 w-4 text-indigo-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {isUrdu ? "سامان اور اسٹاک (Stock)" : "Stock & Inventory"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isUrdu ? "پرزہ جات کا اسٹاک دیکھنا" : "View inventory & parts"}
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.inventory}
                      onChange={() => handlePermissionToggle("inventory")}
                      className="h-4 w-4 rounded text-blue-600 cursor-pointer"
                    />
                  </label>

                  {/* Customers */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                    <div className="flex items-center gap-2.5">
                      <UserCheck className="h-4 w-4 text-cyan-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {isUrdu ? "گاہکوں کا ریکارڈ (Khata)" : "Customer Khata"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isUrdu ? "کسٹمر ہسٹری و بقایا" : "Customer balance & visits"}
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.customers}
                      onChange={() => handlePermissionToggle("customers")}
                      className="h-4 w-4 rounded text-blue-600 cursor-pointer"
                    />
                  </label>

                  {/* Bills History */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                    <div className="flex items-center gap-2.5">
                      <History className="h-4 w-4 text-slate-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {isUrdu ? "پرانے بلز (Invoices)" : "Bill History & Reprint"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isUrdu ? "سابقہ رسیدیں تلاش کرنا" : "Past invoices & reprint"}
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.bills}
                      onChange={() => handlePermissionToggle("bills")}
                      className="h-4 w-4 rounded text-blue-600 cursor-pointer"
                    />
                  </label>

                  {/* Mechanics */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                    <div className="flex items-center gap-2.5">
                      <Users className="h-4 w-4 text-violet-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {isUrdu ? "میکینک کھاتہ (Labour)" : "Mechanics & Labour"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isUrdu ? "مزدوری و کمیشن کھاتہ" : "Mechanic commissions"}
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.mechanics}
                      onChange={() => handlePermissionToggle("mechanics")}
                      className="h-4 w-4 rounded text-blue-600 cursor-pointer"
                    />
                  </label>

                  {/* Suppliers */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                    <div className="flex items-center gap-2.5">
                      <WalletCards className="h-4 w-4 text-rose-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {isUrdu ? "سپلائر ادھار (Suppliers)" : "Supplier Udhaar"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isUrdu ? "ہول سیل کھاتہ و اقساط" : "Wholesale market udhaar"}
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.suppliers}
                      onChange={() => handlePermissionToggle("suppliers")}
                      className="h-4 w-4 rounded text-blue-600 cursor-pointer"
                    />
                  </label>

                  {/* Reports */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                    <div className="flex items-center gap-2.5">
                      <BarChart3 className="h-4 w-4 text-teal-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {isUrdu ? "منافع اور رپورٹس (Analytics)" : "Munafa & Reports"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isUrdu ? "بکری و منافع کی مکمل فائل" : "Full business reports"}
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={permissions.reports}
                      onChange={() => handlePermissionToggle("reports")}
                      className="h-4 w-4 rounded text-blue-600 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-extrabold">
                    {isUrdu ? "مالک / ایڈمن کے پاس مکمل اختیارات ہیں" : "Full Administrator Rights (Malik)"}
                  </div>
                  <div className="text-[11px] text-blue-700 mt-0.5">
                    {isUrdu
                      ? "ایڈمن رول والے صارف کو دکان کے تمام ماڈیولز، سیل، منافع اور یوزر مینجمنٹ کا 100 فیصد رسائی حاصل رہے گی۔"
                      : "Admin users have full access to every module, all financial stats, and user settings."}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                disabled={isSubmitting}
                className="text-xs font-bold"
              >
                {isUrdu ? "منسوخ کریں" : "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20"
              >
                {isSubmitting
                  ? isUrdu
                    ? "محفوظ ہو رہا ہے..."
                    : "Saving..."
                  : isEditing
                  ? isUrdu
                    ? "تبدیلیاں محفوظ کریں"
                    : "Update User"
                  : isUrdu
                  ? "اکاؤنٹ بنائیں"
                  : "Create Account"}
              </Button>
            </div>
          </form>
        )}

        {/* Users List Table */}
        <div className="space-y-2.5">
          <div className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
            {isUrdu ? "موجودہ رجسٹرڈ اسٹاف لسٹ" : "Current Shop Users"}
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-xs text-slate-500 font-semibold animate-pulse">
              {isUrdu ? "اکاؤنٹس لوڈ ہو رہے ہیں..." : "Loading shop accounts..."}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
              {isUrdu ? "کوئی یوزر نہیں ملا" : "No users found"}
            </div>
          ) : (
            <div className="space-y-2">
              {users
                .filter((u) => (u.role as string) !== "superadmin")
                .map((u) => {
                  const isAdminUser = u.role === "admin";
                  const isPrimaryAdmin = u.username === "admin" || u.id === "user-1";
                  const canSeeProfit = isAdminUser || !!u.permissions?.viewSalesAndProfit;

                return (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                          isAdminUser
                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {isAdminUser ? "👑" : "👨‍💼"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900">{u.name}</span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                              isAdminUser
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {isAdminUser
                              ? isUrdu
                                ? "ایڈمن / مالک"
                                : "Admin / Owner"
                              : isUrdu
                              ? "کاؤنٹر اسٹاف"
                              : "Counter Staff"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                          <span>User: <strong className="text-slate-700">{u.username}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {canSeeProfit ? (
                              <span className="text-emerald-700 font-bold text-[10px]">
                                🟢 {isUrdu ? "سیل/منافع دیکھ سکتا ہے" : "Profit Visible"}
                              </span>
                            ) : (
                              <span className="text-rose-700 font-bold text-[10px]">
                                🔒 {isUrdu ? "سیل/منافع بند ہے" : "Profit Hidden"}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Access Badges for Staff */}
                    {!isAdminUser && u.permissions && (
                      <div className="flex flex-wrap gap-1 text-[9px] font-bold text-slate-600 sm:max-w-[260px]">
                        {u.permissions.pos && <span className="bg-slate-100 px-1.5 py-0.5 rounded">POS</span>}
                        {u.permissions.workshop && <span className="bg-slate-100 px-1.5 py-0.5 rounded">Workshop</span>}
                        {u.permissions.inventory && <span className="bg-slate-100 px-1.5 py-0.5 rounded">Stock</span>}
                        {u.permissions.customers && <span className="bg-slate-100 px-1.5 py-0.5 rounded">Gahak</span>}
                        {u.permissions.bills && <span className="bg-slate-100 px-1.5 py-0.5 rounded">Bills</span>}
                        {u.permissions.suppliers && <span className="bg-slate-100 px-1.5 py-0.5 rounded">Supplier</span>}
                        {u.permissions.reports && <span className="bg-slate-100 px-1.5 py-0.5 rounded">Reports</span>}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(u)}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                        title={isUrdu ? "اختیارات تبدیل کریں" : "Edit Permissions / Password"}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      {!isPrimaryAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title={isUrdu ? "یوزر ڈیلیٹ کریں" : "Delete User"}
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
      </div>
    </Modal>
  );
}
