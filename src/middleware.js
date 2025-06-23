import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Add this function to check if a route should be public
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

  return publicRoutes.some((route) => pathname.startsWith(route));
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  console.log(`Middleware: Processing ${pathname}`);

  // Special case for reset password
  if (pathname.startsWith("/auth/reset-password")) {
    console.log("Middleware: Bypassing all checks for reset password page");
    const response = NextResponse.next();
    // Add headers to prevent caching
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  }

  // Check if it's a public route
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // For non-public paths, continue with your existing auth logic
  // ...existing auth logic for protected routes...

  return NextResponse.next();
}

// Optionally configure matching paths
export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
