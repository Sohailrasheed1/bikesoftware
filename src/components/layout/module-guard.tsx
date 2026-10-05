"use client";

import React from "react";
import Link from "next/link";
import { Lock, ArrowLeft, ArrowRight, ShieldAlert, Loader2, Home } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLanguage } from "@/lib/i18n/context";
import { UserPermissions } from "@/types";

export interface RouteSecurityConfig {
  module?: keyof UserPermissions;
  requireFinancial?: boolean;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  name: string;
  nameUrdu: string;
  descriptionUrdu: string;
  descriptionEn: string;
}

export const ROUTE_SECURITY_CONFIG: Record<string, RouteSecurityConfig> = {
  "/billing": {
    module: "pos",
    name: "Fast POS & Billing",
    nameUrdu: "نیا بل اور پوائنٹ آف سیل",
    descriptionUrdu: "آپ کے اکاؤنٹ کو نیا بل بنانے (POS Billing) کی اجازت تفویض نہیں کی گئی ہے۔",
    descriptionEn: "Your account does not have permission to access the Fast POS & Billing module.",
  },
  "/inventory": {
    module: "inventory",
    name: "Inventory & Stock Management",
    nameUrdu: "سامان اور اسٹاک مینجمنٹ",
    descriptionUrdu: "آپ کے اکاؤنٹ کو سامان کی فہرست، ریٹ لسٹ اور اسٹاک مینجمنٹ دیکھنے کی اجازت نہیں ہے۔",
    descriptionEn: "Your account does not have permission to access Inventory and Stock Management.",
  },
  "/workshop": {
    module: "workshop",
    name: "Live Workshop Bay",
    nameUrdu: "ورکشاپ لائیو بے",
    descriptionUrdu: "آپ کے اکاؤنٹ کو ورکشاپ جاب کارڈز اور گاڑیوں کا لائیو کام دیکھنے کی اجازت نہیں ہے۔",
    descriptionEn: "Your account does not have permission to access the Live Workshop Bay module.",
  },
  "/customers": {
    module: "customers",
    name: "Customer Directory & History",
    nameUrdu: "گاہکوں کا ریکارڈ اور کھاتہ",
    descriptionUrdu: "آپ کے اکاؤنٹ کو گاہکوں کی معلومات اور سابقہ سروس ریکارڈ دیکھنے کی اجازت نہیں ہے۔",
    descriptionEn: "Your account does not have permission to view Customer Directory and Khata records.",
  },
  "/bills": {
    module: "bills",
    name: "Bill History & Invoices",
    nameUrdu: "پرانے بلز اور انوائسز",
    descriptionUrdu: "آپ کے اکاؤنٹ کو سابقہ بلز دیکھنے اور انوائسز ری پرنٹ کرنے کی اجازت نہیں ہے۔",
    descriptionEn: "Your account does not have permission to view Bill History and previous invoices.",
  },
  "/mechanics": {
    module: "mechanics",
    name: "Mechanics & Labour Khata",
    nameUrdu: "میکینک کھاتہ اور لیبر ادائیگی",
    descriptionUrdu: "آپ کے اکاؤنٹ کو میکینک کھاتہ، کمیشن حساب اور لیبر ادائیگی دیکھنے کی اجازت نہیں ہے۔",
    descriptionEn: "Your account does not have permission to view Mechanic Accounts and Labour Payouts.",
  },
  "/reports": {
    module: "reports",
    requireFinancial: true,
    name: "Sales & Profit Reports",
    nameUrdu: "منافع اور سیلز رپورٹس",
    descriptionUrdu: "آپ کے اکاؤنٹ کو دکان کی روزانہ سیلز، مارجن اور خالص منافع کی رپورٹس دیکھنے کی اجازت نہیں ہے۔",
    descriptionEn: "Your account does not have permission to access Sales and Profit Analytics Reports.",
  },
  "/suppliers": {
    module: "suppliers",
    name: "Supplier Udhaar & Khata",
    nameUrdu: "سپلائر کا ادھار کھاتہ",
    descriptionUrdu: "آپ کے اکاؤنٹ کو مارکیٹ ہول سیلرز اور سپلائر کا ادھار کھاتہ دیکھنے کی اجازت نہیں ہے۔",
    descriptionEn: "Your account does not have permission to view Supplier Wholesale and Credit Khata.",
  },
  "/super-admin": {
    requireSuperAdmin: true,
    name: "Super Admin SaaS Portal",
    nameUrdu: "سپر ایڈمن ساس پورٹل",
    descriptionUrdu: "یہ پورٹل صرف پلیٹ فارم کے مرکزی سپر ایڈمنسٹریٹر کے لیے مخصوص ہے۔",
    descriptionEn: "This portal is strictly restricted to platform Super Administrators only.",
  },
};

/**
 * Match a pathname against the route security configuration.
 */
export function getRouteSecurityConfig(pathname: string): RouteSecurityConfig | null {
  for (const [route, config] of Object.entries(ROUTE_SECURITY_CONFIG)) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      return config;
    }
  }
  return null;
}

/**
 * Access Restricted UI component:
 * Clean, modern, accessible presentation for restricted modules.
 */
export function AccessRestrictedCard({
  config,
  reason,
}: {
  config: RouteSecurityConfig;
  reason?: string;
}) {
  const { isUrdu } = useLanguage();
  const { user, isStaff } = useCurrentUser();
  const BackArrow = isUrdu ? ArrowRight : ArrowLeft;

  const currentUserName = user?.name || user?.username || (isStaff ? "Staff Member" : "User");

  return (
    <div className="min-h-[55vh] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl text-center space-y-5">
        {/* Lock Icon Badge */}
        <div className="h-16 w-16 bg-rose-50 text-rose-600 border border-rose-200/80 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Lock className="h-8 w-8" />
        </div>

        {/* Heading */}
        <div className="space-y-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-rose-600 bg-rose-100/60 px-3 py-1 rounded-full border border-rose-200">
            {isUrdu ? "اختیار محدود ہے" : "Access Restricted"}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 pt-1.5">
            {isUrdu ? config.nameUrdu : config.name}
          </h2>
        </div>

        {/* Descriptive Note */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 text-xs text-slate-600 leading-relaxed text-center space-y-2">
          <p className="font-semibold text-slate-800">
            {isUrdu ? config.descriptionUrdu : config.descriptionEn}
          </p>
          <p className="text-slate-500 text-[11px]">
            {isUrdu
              ? "اگر آپ کو دکان کے کام کے لیے اس ماڈیول کی ضرورت ہے تو برائے مہربانی دکان کے مالک (ایڈمن) سے رابطہ کریں تاکہ وہ آپ کے اکاؤنٹ کو پرمیشن تفویض کر سکیں۔"
              : "If your daily workshop duty requires this module, please contact the Shop Owner (Admin) to grant your account the required permission."}
          </p>
        </div>

        {/* User identification strip */}
        <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-slate-400" />
          <span>
            {isUrdu ? "موجودہ صارف:" : "Logged in as:"}{" "}
            <strong className="text-slate-700">{currentUserName}</strong>
          </span>
        </div>

        {/* Back to Home Button */}
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-500/10 transition"
          >
            <Home className="h-4 w-4" />
            <span>{isUrdu ? "واپس مرکزی صفحہ (ڈیش بورڈ)" : "Back to Main Dashboard"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * RouteGuard Container:
 * Inspects route configuration against current user's session and permissions.
 * If user lacks access, renders AccessRestrictedCard.
 * If loading, renders a clean, subtle skeleton.
 * If allowed, renders children.
 */
export function RouteGuard({
  pathname,
  children,
}: {
  pathname: string;
  children: React.ReactNode;
}) {
  const userState = useCurrentUser();
  const { isLoading, isAdmin, isSuperAdmin, canAccessModule, canViewSalesAndProfit } = userState;

  const config = getRouteSecurityConfig(pathname);

  // If this route has no specific security config (e.g. "/", "/login"), allow immediately
  if (!config) {
    return <>{children}</>;
  }

  // If session is still resolving, do NOT block page navigation with intrusive full-screen loaders.
  // Render children immediately so pages feel instant, snappy and fast.
  if (isLoading) {
    // Only super-admin route needs a brief subtle guard to prevent portal exposure
    if (config.requireSuperAdmin) {
      return null;
    }
    return <>{children}</>;
  }

  // Super Admin check
  if (config.requireSuperAdmin) {
    if (!isSuperAdmin) {
      return (
        <AccessRestrictedCard
          config={config}
          reason="Super Admin rights required."
        />
      );
    }
    return <>{children}</>;
  }

  // Shop Admin check
  if (config.requireAdmin) {
    if (!isAdmin && !isSuperAdmin) {
      return (
        <AccessRestrictedCard
          config={config}
          reason="Shop Admin rights required."
        />
      );
    }
    return <>{children}</>;
  }

  // Admin and Superadmin have full access to all shop modules
  if (isAdmin || isSuperAdmin) {
    return <>{children}</>;
  }

  // Check financial view permission (Sales & Profit)
  if (config.requireFinancial && !canViewSalesAndProfit) {
    return (
      <AccessRestrictedCard
        config={config}
        reason="Sales & Profit permission required."
      />
    );
  }

  // Check specific module permission for staff
  if (config.module && !canAccessModule(config.module)) {
    return (
      <AccessRestrictedCard
        config={config}
        reason="Module permission not granted to this staff account."
      />
    );
  }

  return <>{children}</>;
}
