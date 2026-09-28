import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/storage/context";
import { AuthProvider } from "@/components/providers/auth-provider";
import { LanguageProvider } from "@/lib/i18n/context";
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
  title: "Skander Spare Parts — Complete Shop Management System",
  description:
    "Professional motorcycle spare parts shop management software for Skander Spare Parts, Karachi. Bilingual: Roman Urdu & Proper Urdu with Inventory, Workshop, POS Billing, Customers, and Reports.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Skander Parts",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ur-Latn">
      <body className="antialiased font-sans text-slate-900 bg-slate-50 selection:bg-blue-100 selection:text-blue-900">
        <AuthProvider>
          <LanguageProvider>
            <StoreProvider>
              <Shell>{children}</Shell>
            </StoreProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
