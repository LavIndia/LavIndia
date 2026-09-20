import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  });
  const isLoggedIn = !!token;
  const userRole = token?.role;

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
      // Keep the query string: without it a sign-in prompted by
      // /profile?tab=wishlist would send the customer back to the wrong tab.
      loginUrl.searchParams.set("callbackUrl", `${nextUrl.pathname}${nextUrl.search}`);
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
    loginUrl.searchParams.set("callbackUrl", `${nextUrl.pathname}${nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

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
