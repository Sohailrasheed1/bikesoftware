"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Wrench,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { language, setLanguage, t, isUrdu } = useLanguage();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(
          isUrdu
            ? "صارف کا نام یا پاس ورڈ غلط ہے۔ براہ کرم دوبارہ چیک کریں۔"
            : "Email/Username ya Password ghalat hai. Baraye meharbani dobara check karein."
        );
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setError(
        err?.message ||
          (isUrdu
            ? "لاگ ان کرنے میں مسئلہ پیش آیا۔"
            : "Login karne mein masla aaya.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setLoading(true);
    setError("");
    try {
      const res = await signIn("credentials", {
        username: user,
        password: pass,
        redirect: false,
      });
      if (!res?.error) {
        router.push("/");
        router.refresh();
      } else {
        setError(
          isUrdu ? "لاگ ان ناکام رہا۔" : "Login failed. Check credentials."
        );
      }
    } catch {
      setError(isUrdu ? "لاگ ان ناکام رہا" : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3.5 sm:p-6 bg-slate-50 relative overflow-hidden">
      {/* Decorative gradient backdrops */}
      <div className="absolute top-0 right-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md glass-card rounded-3xl p-5 sm:p-8 shadow-xl border border-white/80 space-y-4">
        {/* Language Switcher Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {t.switchLangPrompt}:
          </span>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setLanguage("roman")}
              className={cn(
                "px-2.5 py-0.5 rounded text-[11px] font-extrabold transition",
                language === "roman" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"
              )}
            >
              Roman Urdu
            </button>
            <button
              type="button"
              onClick={() => setLanguage("ur")}
              className={cn(
                "px-2.5 py-0.5 rounded text-[11px] font-extrabold transition",
                language === "ur" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600"
              )}
            >
              🇵🇰 اردو
            </button>
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2 pb-2">
          <div className="inline-flex h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Wrench className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {t.appName}
            </h1>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              {t.appSubtitle}
            </p>
            <p className="text-xs text-blue-600 font-bold mt-1">
              {isUrdu ? "ایڈمن اور کاؤنٹر اسٹاف لاگ ان" : "Admin & Counter Staff Login"}
            </p>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-in fade-in">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <Input
              label={isUrdu ? "صارف کا نام / ای میل *" : "Email ya Username *"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isUrdu ? "صارف نام لکھیں..." : "admin ya email..."}
              required
              className="h-11 text-xs sm:text-sm"
            />
          </div>

          <div>
            <Input
              label={isUrdu ? "پاس ورڈ *" : "Password (پاس ورڈ) *"}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="h-11 text-xs sm:text-sm"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            isLoading={loading}
            className="w-full h-11 font-black shadow-md bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm"
          >
            {isUrdu ? "سافٹ ویئر میں لاگ ان کریں" : "Software Mein Login Karein"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </form>

        {/* 1-Click Quick Demo Login credentials for client demonstration */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
            {isUrdu ? "کلائنٹ ڈیمو: 1-کلک لاگ ان" : "Asani Ke Liye 1-Click Fast Login"}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin("admin@skanderparts.pk", "admin123")}
              className="p-2.5 rounded-xl border border-slate-200 bg-white/90 hover:bg-blue-50 hover:border-blue-300 text-slate-700 font-semibold transition text-left active:scale-95"
            >
              <div className="text-blue-700 font-black text-xs">
                1. {isUrdu ? "ایڈمن (مالک)" : "Admin (Malik)"}
              </div>
              <div className="text-[10px] text-slate-400 truncate">admin</div>
              <div className="text-[10px] font-mono text-slate-500 font-bold">Pass: admin123</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin("staff@skanderparts.pk", "staff123")}
              className="p-2.5 rounded-xl border border-slate-200 bg-white/90 hover:bg-blue-50 hover:border-blue-300 text-slate-700 font-semibold transition text-left active:scale-95"
            >
              <div className="text-emerald-700 font-black text-xs">
                2. {isUrdu ? "کاؤنٹر اسٹاف" : "Counter Staff"}
              </div>
              <div className="text-[10px] text-slate-400 truncate">staff</div>
              <div className="text-[10px] font-mono text-slate-500 font-bold">Pass: staff123</div>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleQuickLogin("sohail@skanderparts.pk", "sohail123")}
            className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 font-semibold transition flex items-center justify-between text-xs active:scale-95"
          >
            <div>
              <span className="text-indigo-700 font-bold">
                3. {isUrdu ? "منیجر سہیل: " : "Manager Sohail: "}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">sohail</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
              Pass: sohail123
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
