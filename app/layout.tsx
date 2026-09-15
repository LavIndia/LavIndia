import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartProvider";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { Toaster } from "sonner";
import { AuthDialogGate } from "@/components/auth/AuthDialogGate";
import { SiteSettingsProvider } from "@/components/providers/SiteSettingsProvider";
import { getSiteSettings } from "@/lib/site-settings";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: settings.metaTitle || settings.businessName,
    description:
      settings.metaDescription || "Luxury handcrafted jewelry from India",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <SiteSettingsProvider
          value={{
            businessName: settings.businessName,
            copyrightText: settings.copyrightText,
          }}
        >
          <SessionProvider>
            <CartProvider>
              {children}
              <AuthDialogGate />
              <Toaster position="top-right" richColors />
            </CartProvider>
          </SessionProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
