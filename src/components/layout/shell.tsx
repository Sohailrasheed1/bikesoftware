"use client";

import React, { useEffect } from "react";
import { Navbar } from "./navbar";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  const isLoginPage = pathname === "/login";
  const isSuperAdmin = pathname.startsWith("/super-admin");

  // Save active online session to localStorage for offline fallback
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      try {
        localStorage.setItem("gilani_autos_logged_in", "true");
        localStorage.setItem("gilani_autos_offline_session", JSON.stringify(session.user));
      } catch (e) {}
    }
  }, [status, session]);

  // If unauthenticated and on a protected page (and no local offline session), redirect to login
  useEffect(() => {
    const hasOfflineSession =
      typeof window !== "undefined" &&
      (localStorage.getItem("gilani_autos_logged_in") === "true" ||
        !!localStorage.getItem("gilani_autos_offline_session"));

    if (!isLoginPage && status === "unauthenticated" && !hasOfflineSession) {
      const redirectUrl =
        pathname && pathname !== "/"
          ? `/login?callbackUrl=${encodeURIComponent(pathname)}`
          : "/login";
      router.replace(redirectUrl);
    }
  }, [status, isLoginPage, pathname, router]);

  // If on login page, render full screen without navbar
  if (isLoginPage) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  // If on super admin portal, render directly
  if (isSuperAdmin) {
    return <main className="min-h-screen bg-slate-900">{children}</main>;
  }

  const isSuperAdminUser = (session?.user as any)?.role === "superadmin";

  // Render software dashboard & pages without any blocking authorization overlay
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 text-slate-900">
      {/* Super Admin Top Control Ribbon (Only visible when Super Admin is viewing shop) */}
      {isSuperAdminUser && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-2 text-xs font-bold flex items-center justify-between border-b border-indigo-500/30 shadow-md">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>👑 Super Admin Mode: Viewing Shop Database</span>
          </div>
          <Link
            href="/super-admin"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-extrabold shadow-sm transition active:scale-95"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back to SaaS Control Panel (سپر ایڈمن پورٹل)</span>
          </Link>
        </div>
      )}

      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>
    </div>
  );
}
