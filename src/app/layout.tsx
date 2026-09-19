import type { Metadata } from "next";
import { Playfair_Display, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartProvider";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { AuthDialogProvider } from "@/components/auth/AuthDialogProvider";
import { Toaster } from "sonner";
import { SiteSettingsProvider } from "@/components/providers/SiteSettingsProvider";
import { getSiteSettings } from "@/lib/site-settings";
import { getFeaturedCategories } from "@/lib/homepage-data";
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
    // Lets every page's relative OG/Twitter image paths (e.g. a product
    // photo at "/assets/...") resolve to an absolute URL, which social
    // apps and messaging previews require. NEXTAUTH_URL wins if it's set
    // (set it explicitly if the Vercel fallback domain is what's actually
    // live); otherwise the real custom domain in production, localhost in
    // local dev.
    metadataBase: new URL(
      process.env.NEXTAUTH_URL ||
        (process.env.NODE_ENV === "production"
          ? "https://shoplavindia.com"
          : "http://localhost:8002"),
    ),
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
  const [settings, featuredCategories] = await Promise.all([
    getSiteSettings(),
    getFeaturedCategories(),
  ]);

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
            navCategories: featuredCategories.map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
            })),
            contactNumber: settings.contactNumber,
            contactEmail: settings.email,
            address: settings.address,
            gstNumber: settings.gstNumber,
            amazonLink: settings.amazonLink,
            flipkartLink: settings.flipkartLink,
            myntraLink: settings.myntraLink,
            blinkitLink: settings.blinkitLink,
            zeptoLink: settings.zeptoLink,
            codFeeCents: settings.codFeeCents,
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
