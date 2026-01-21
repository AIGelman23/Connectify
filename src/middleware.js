import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Configuration for public routes
function isPublicRoute(pathname) {
  const publicRoutes = [
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/validate-reset-token",
  ];

  // Also allow static files and images
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") || // Essential for NextAuth internal routes
    pathname.includes(".") // favicon, images, etc.
  ) {
    return true;
  }

  return publicRoutes.some((route) => pathname.startsWith(route));
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Special case for Reset Password Page
  if (pathname.startsWith("/auth/reset-password")) {
    const response = NextResponse.next();
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  }

  // 2. Allow Public Routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 3. Auth Check for Protected Routes
  // This uses the JWT from the cookie, so it doesn't hit Prisma/Database.
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    // If user tries to hit an API route without a token, return JSON
    if (pathname.startsWith("/api")) {
      return new NextResponse(
        JSON.stringify({ message: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // If user tries to hit a Page route, redirect to Login
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Authorized - Proceed
  return NextResponse.next();
}

// Ensure the middleware runs on all routes except specific static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
