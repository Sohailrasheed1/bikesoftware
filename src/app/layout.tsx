import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { StoreProvider } from "@/lib/storage/context";
import { AuthProvider } from "@/components/providers/auth-provider";
import { LanguageProvider, APP_LANGUAGE_STORAGE_KEY } from "@/lib/i18n/context";
import { ToastProvider } from "@/components/providers/toast-provider";
import { Shell } from "@/components/layout/shell";
import { ServiceWorkerRegister } from "@/components/providers/service-worker-register";
import { getAssetUrl } from "@/lib/version";

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Jilani Autos — Complete Shop Management System",
  description:
    "Professional motorcycle spare parts shop management software for Jilani Autos, Karachi. Bilingual: Roman Urdu & Proper Urdu with Inventory, Workshop, POS Billing, Customers, and Reports.",
  manifest: getAssetUrl("/manifest.json"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Jilani Autos",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: getAssetUrl("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { url: getAssetUrl("/icon-512.png"), sizes: "512x512", type: "image/png" },
      { url: getAssetUrl("/icon.svg"), type: "image/svg+xml" },
    ],
    apple: [
      { url: getAssetUrl("/apple-touch-icon.png"), sizes: "180x180", type: "image/png" },
    ],
    shortcut: getAssetUrl("/icon-192.png"),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const savedLang = cookieStore.get(APP_LANGUAGE_STORAGE_KEY)?.value;
  const isUrdu = savedLang === "ur";

  return (
    <html
      lang={isUrdu ? "ur" : "ur-Latn"}
      dir={isUrdu ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href={getAssetUrl("/manifest.json")} />
      </head>
      <body
        suppressHydrationWarning
        className={`antialiased font-sans text-slate-900 bg-slate-50 selection:bg-blue-100 selection:text-blue-900${
          isUrdu ? " font-urdu" : ""
        }`}
      >
        <AuthProvider>
          <LanguageProvider initialLanguage={isUrdu ? "ur" : "roman"}>
            <ServiceWorkerRegister />
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
