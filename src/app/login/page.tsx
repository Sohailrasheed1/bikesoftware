"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Wrench,
  ArrowRight,
  ShieldCheck,
  Lock,
  User,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/context";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, setLanguage, t, isUrdu } = useLanguage();
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already authenticated (online or offline session), redirect immediately away from login
  useEffect(() => {
    const hasOfflineSession =
      typeof window !== "undefined" &&
      (localStorage.getItem("jilani_autos_logged_in") === "true" ||
        localStorage.getItem("gilani_autos_logged_in") === "true" ||
        !!localStorage.getItem("jilani_autos_offline_session") ||
        !!localStorage.getItem("gilani_autos_offline_session"));

    if (status === "authenticated" || hasOfflineSession) {
      let isSuper = false;
      if (session?.user) {
        isSuper = (session.user as any)?.role === "superadmin";
      } else if (typeof window !== "undefined") {
        try {
          const offUser = JSON.parse(
            localStorage.getItem("jilani_autos_offline_session") ||
            localStorage.getItem("gilani_autos_offline_session") ||
            "{}"
          );
          isSuper = offUser.role === "superadmin";
        } catch {}
      }

      if (isSuper) {
        window.location.href = "/super-admin";
      } else {
        router.replace(callbackUrl);
      }
    }
  }, [status, session, router, callbackUrl]);

  // Guarantee direct DOM type attribute update for password input
  useEffect(() => {
    const el = document.getElementById("password-input") as HTMLInputElement | null;
    if (el) {
      el.type = showPassword ? "text" : "password";
    }
  }, [showPassword]);

  // Helper function to handle offline login
  const handleOfflineLogin = (u: string, p: string): boolean => {
    const lowerU = u.toLowerCase().trim();
    let isMatched = false;
    let role = "admin";
    let shopName = "Jilani Autos";

    if (lowerU === "admin" && (p === "admin123" || p === "admin")) isMatched = true;
    if (lowerU === "staff" && (p === "staff123" || p === "staff")) { isMatched = true; role = "staff"; }
    if (lowerU === "sohail" && (p === "sohail123" || p === "sohail" || p === "admin123")) isMatched = true;
    if (lowerU === "superadmin" && (p === "superadmin123" || p === "admin123" || p === "superadmin" || p === "sohail123")) {
      isMatched = true;
      role = "superadmin";
      shopName = "Platform Super Admin";
    }

    if (!isMatched) {
      // Check cached session
      try {
        const cachedUser = JSON.parse(localStorage.getItem("jilani_autos_offline_session") || "{}");
        if (cachedUser.name && cachedUser.name.toLowerCase() === lowerU) {
          isMatched = true;
          role = cachedUser.role || "admin";
          shopName = cachedUser.shopName || "Jilani Autos";
        }
      } catch {}
    }

    if (isMatched) {
      const offlineUser = { id: `off-${lowerU}`, name: u, role, shopName };
      localStorage.setItem("jilani_autos_logged_in", "true");
      localStorage.setItem("jilani_autos_offline_session", JSON.stringify(offlineUser));

      toast.success(
        isUrdu ? "آف لائن لاگ ان کامیاب! 📶" : "Offline Login Successful! 📶",
        isUrdu ? "سافٹ ویئر کا ڈیش بورڈ آف لائن کھولا جا رہا ہے..." : "Entering software dashboard in offline mode..."
      );

      setTimeout(() => {
        if (role === "superadmin") {
          window.location.href = "/super-admin";
        } else {
          window.location.href = callbackUrl || "/";
        }
      }, 400);
      return true;
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      const msg = isUrdu
        ? "براہ کرم صارف کا نام اور پاس ورڈ دونوں درج کریں۔"
        : "Baraye meharbani username aur password dono enter karein.";
      setError(msg);
      toast.warning(isUrdu ? "معلومات نامکمل ہیں" : "Missing Credentials", msg);
      return;
    }

    setLoading(true);

    // If device is offline, attempt offline login immediately
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const success = handleOfflineLogin(cleanUsername, password);
      if (!success) {
        const errorMsg = isUrdu
          ? "آف لائن موڈ: صارف کا نام یا پاس ورڈ غلط ہے۔"
          : "Offline Mode: Username ya Password ghalat hai.";
        setError(errorMsg);
        toast.error(isUrdu ? "لاگ ان ناکام" : "Login Failed", errorMsg);
      }
      setLoading(false);
      return;
    }

    try {
      const res = await signIn("credentials", {
        username: cleanUsername,
        password: password,
        redirect: false,
      });

      if (res?.error) {
        // Fallback to offline login if credentials / network check fails
        const success = handleOfflineLogin(cleanUsername, password);
        if (!success) {
          const errorMsg =
            res.error === "CredentialsSignin"
              ? isUrdu
                ? "صارف کا نام یا پاس ورڈ غلط ہے۔ براہ کرم دوبارہ چیک کریں۔"
                : "Username ya Password ghalat hai. Baraye meharbani dobara check karein."
              : res.error;

          setError(errorMsg);
          toast.error(isUrdu ? "لاگ ان ناکام رہا" : "Login Failed", errorMsg);
        }
      } else {
        // Save session locally for offline fallback
        let isSuper =
          cleanUsername.toLowerCase() === "superadmin" ||
          cleanUsername.toLowerCase() === "sohail" ||
          cleanUsername.toLowerCase() === "sohailtest799@gmail.com";

        try {
          const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
          const sessionData = await sessionRes.json();
          if (sessionData?.user?.role === "superadmin") {
            isSuper = true;
          }
        } catch (e) {
          console.error("Session fetch error:", e);
        }

        localStorage.setItem("jilani_autos_logged_in", "true");
        localStorage.setItem(
          "jilani_autos_offline_session",
          JSON.stringify({
            name: cleanUsername,
            role: isSuper ? "superadmin" : "admin",
            shopName: isSuper ? "Platform Super Admin" : "Jilani Autos",
          })
        );

        if (isSuper) {
          toast.success(
            "Super Admin Khush Amdeed! 👑",
            "SaaS Control Center par redirect ho rahe hain..."
          );
          setTimeout(() => {
            window.location.href = "/super-admin";
          }, 400);
        } else {
          toast.success(
            isUrdu ? "لاگ ان کامیاب!" : "Login Successful!",
            isUrdu ? "سافٹ ویئر میں داخل ہو رہے ہیں..." : "Entering software dashboard..."
          );
          setTimeout(() => {
            window.location.href = callbackUrl || "/";
          }, 400);
        }
      }
    } catch (err: any) {
      // If network exception occurs during signIn fetch, fallback to offline login
      const success = handleOfflineLogin(cleanUsername, password);
      if (!success) {
        const errMsg =
          err?.message ||
          (isUrdu ? "لاگ ان کرنے میں مسئلہ پیش آیا۔" : "Login karne mein masla aaya.");
        setError(errMsg);
        toast.error(isUrdu ? "سسٹم کی خرابی" : "System Error", errMsg);
      }
    } finally {
      setLoading(false);
    }
  };



  if (status === "authenticated") {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-3">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <p className="text-xs font-bold text-slate-600">
          {isUrdu ? "سافٹ ویئر میں داخل ہو رہے ہیں..." : "Entering software..."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md glass-card rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/80 space-y-5">
      {/* Language Switcher Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {t.switchLangPrompt}:
        </span>
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setLanguage("roman")}
            className={cn(
              "px-2.5 py-0.5 rounded text-[11px] font-extrabold transition",
              language === "roman"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600"
            )}
          >
            Roman Urdu
          </button>
          <button
            type="button"
            onClick={() => setLanguage("ur")}
            className={cn(
              "px-2.5 py-0.5 rounded text-[11px] font-extrabold transition",
              language === "ur"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600"
            )}
          >
            🇵🇰 اردو
          </button>
        </div>
      </div>

      {/* Brand Header */}
      <div className="text-center space-y-2 pb-1">
        <div className="inline-flex h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden shadow-xl shadow-blue-500/25 border-2 border-white/90 p-0.5 bg-gradient-to-tr from-blue-700 to-indigo-900">
          <img
            src="/icon-192.png"
            alt="Jilani Autos Logo"
            className="h-full w-full object-cover rounded-[14px]"
          />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t.appName}
          </h1>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
            {t.appSubtitle}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs mt-2.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>
              {isUrdu
                ? "محفوظ لاگ ان — صرف مجاز عملہ"
                : "Secure Login — Authorized Staff & Admin"}
            </span>
          </div>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-in fade-in flex items-start gap-2">
          <div className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username / Email field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
            {isUrdu ? "صارف کا نام / ای میل *" : "Email ya Username *"}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isUrdu ? "صارف کا نام لکھیں..." : "superadmin ya admin..."}
              autoComplete="username"
              required
              className="flex h-11 w-full rounded-xl border border-slate-200/90 bg-white/90 pl-10 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Password field with Show/Hide toggle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
              {isUrdu ? "پاس ورڈ *" : "Password (پاس ورڈ) *"}
            </label>
            <button
              type="button"
              id="label-toggle-password-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPassword((prev) => !prev);
              }}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer transition select-none"
            >
              {showPassword ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-blue-600" />
                  <span>{isUrdu ? "چھپائیں (Hide)" : "Hide (چھپائیں)"}</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 text-blue-600" />
                  <span>{isUrdu ? "دکھائیں (Show)" : "Show (دکھائیں)"}</span>
                </>
              )}
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              id="password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={showPassword ? "Password enter karein" : "••••••••"}
              autoComplete="current-password"
              required
              className={cn(
                "flex h-11 w-full rounded-xl border pl-10 pr-12 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:outline-none focus:ring-2 font-sans tracking-normal",
                showPassword
                  ? "border-blue-300 bg-blue-50/20 focus:border-blue-600 focus:ring-blue-100"
                  : "border-slate-200/90 bg-white focus:border-blue-500 focus:ring-blue-100"
              )}
            />
            <button
              type="button"
              id="toggle-password-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPassword((prev) => !prev);
              }}
              className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-slate-500 hover:text-blue-600 cursor-pointer z-30 transition select-none focus:outline-none group"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-blue-600 stroke-[2.2] group-hover:scale-110 transition-transform" />
              ) : (
                <Eye className="h-5 w-5 text-slate-500 hover:text-slate-800 stroke-[2.2] group-hover:scale-110 transition-transform" />
              )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 active:scale-98 transition rounded-xl"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isUrdu ? "تصدیق ہو رہی ہے..." : "Verifying credentials..."}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>{isUrdu ? "سافٹ ویئر کھولیں" : "Login to Software"}</span>
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-900">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <Suspense
        fallback={
          <div className="p-8 text-center text-white text-xs font-bold">
            Loading...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
