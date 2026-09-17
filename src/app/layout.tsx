import type { Metadata } from "next";
import { Playfair_Display, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartProvider";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { AuthDialogProvider } from "@/components/auth/AuthDialogProvider";
import { Toaster } from "sonner";
import { SiteSettingsProvider } from "@/components/providers/SiteSettingsProvider";
import { getSiteSettings } from "@/lib/site-settings";
import { css } from "styled-system/css";

const bodyStyle = css({
  fontFamily: "body",
  fontSmoothing: "antialiased",
});

const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Inter({
  variable: "--font-body",
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
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className={bodyStyle} suppressHydrationWarning>
        <SiteSettingsProvider
          value={{
            businessName: settings.businessName,
            copyrightText: settings.copyrightText,
          }}
        >
          <SessionProvider>
            <AuthDialogProvider>
              <CartProvider>
                {children}
                <Toaster position="top-right" richColors />
              </CartProvider>
            </AuthDialogProvider>
          </SessionProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
