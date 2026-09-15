import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isProtectedRoute = [
    "/profile",
    "/orders",
    "/addresses",
    "/wishlist",
    "/checkout",
  ].some((path) => nextUrl.pathname.startsWith(path));

  // Allow auth routes
  if (isAuthRoute) {
    return NextResponse.next();
  }

  // Removed automatic redirect of admins from homepage
  // Admins can now browse the site as customers

  // Protect admin routes
  if (isAdminRoute) {
    if (!isLoggedIn) {
      // Redirect to login if not authenticated
      const loginUrl = new URL("/", nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (userRole !== "ADMIN") {
      // Redirect non-admin users to homepage
      return NextResponse.redirect(new URL("/", nextUrl.origin));
    }

    return NextResponse.next();
  }

  // Protect customer routes
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/profile",
    "/orders",
    "/addresses",
    "/wishlist",
    "/checkout/:path*",
  ],
};
