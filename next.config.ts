import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    const storageRewrite =
      process.env.IMAGEKIT_ENABLED === "true" &&
      process.env.IMAGEKIT_URL_ENDPOINT
        ? {
            source: "/assets/:path*",
            destination: `${process.env.IMAGEKIT_URL_ENDPOINT.replace(/\/+$/, "")}/assets/:path*`,
          }
        : null;

    return [
      ...(storageRewrite ? [storageRewrite] : []),
      // Shop pages - maintain original URLs
      // (/earrings, /necklaces, /rings are handled directly by the generic
      // src/app/[category]/page.tsx now, same as any other category — no
      // rewrite needed)
      {
        source: "/bestsellers",
        destination: "/shop-pages/bestsellers",
      },
      {
        source: "/new-arrivals",
        destination: "/shop-pages/new-arrivals",
      },
      {
        source: "/product/:id",
        destination: "/shop-pages/product/:id",
      },
      {
        source: "/checkout",
        destination: "/shop-pages/checkout",
      },
      {
        source: "/budget",
        destination: "/shop-pages/budget",
      },
      {
        source: "/shop/budget",
        destination: "/shop-pages/budget",
      },
      // Account pages - maintain original URLs
      {
        source: "/profile",
        destination: "/account-pages/profile",
      },
      {
        source: "/orders",
        destination: "/account-pages/orders",
      },
      {
        source: "/order-success",
        destination: "/account-pages/order-success",
      },
      {
        source: "/order-failed",
        destination: "/account-pages/order-failed",
      },
    ];
  },
};

export default nextConfig;
