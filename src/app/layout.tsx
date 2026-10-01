import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/storage/context";
import { AuthProvider } from "@/components/providers/auth-provider";
import { LanguageProvider } from "@/lib/i18n/context";
import { ToastProvider } from "@/components/providers/toast-provider";
import { Shell } from "@/components/layout/shell";

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Gilani Autos — Complete Shop Management System",
  description:
    "Professional motorcycle spare parts shop management software for Gilani Autos, Karachi. Bilingual: Roman Urdu & Proper Urdu with Inventory, Workshop, POS Billing, Customers, and Reports.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gilani Autos",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

import { ServiceWorkerRegister } from "@/components/providers/service-worker-register";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ur-Latn">
      <body className="antialiased font-sans text-slate-900 bg-slate-50 selection:bg-blue-100 selection:text-blue-900">
        <ServiceWorkerRegister />
        <AuthProvider>
          <LanguageProvider>
            <ToastProvider>
              <StoreProvider>
                <Shell>{children}</Shell>
              </StoreProvider>
            </ToastProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
