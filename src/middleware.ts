import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const secret =
    process.env.NEXTAUTH_SECRET ||
    "skander_spare_parts_super_secret_jwt_key_2026_xyz";

  const token = await getToken({ req, secret });
  const { pathname, search } = req.nextUrl;

  const isLoginPage = pathname === "/login";
  const isAuthApi = pathname.startsWith("/api/auth");
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-touch-icon") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".webp") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html" ||
    pathname === "/robots.txt" ||
    pathname === "/api/app-version";

  // Ignore browser extensions probing /api/ext
  if (pathname.startsWith("/api/ext")) {
    return NextResponse.json({ ok: true });
  }

  // Always allow public assets and NextAuth internal endpoints
  if (isPublicAsset || isAuthApi) {
    return NextResponse.next();
  }

  // If user is already authenticated and visits /login, redirect them
  if (isLoginPage) {
    if (token) {
      if (token.role === "superadmin") {
        return NextResponse.redirect(new URL("/super-admin", req.url));
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // If user is NOT authenticated:
  if (!token) {
    // If it's an internal API route (not auth), return JSON 401 Unauthorized
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized. Please login to access this resource." },
        { status: 401 }
      );
    }

    // For all protected pages, redirect to /login with callbackUrl
    const loginUrl = new URL("/login", req.url);
    const callbackPath = `${pathname}${search || ""}`;
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", callbackPath);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Protect Super Admin Portal and APIs:
  // ONLY role === 'superadmin' is permitted!
  // Normal shop owners / staff get 403 on API and redirected to "/" on pages with NO hint of super-admin.
  const isSuperAdminRoute = pathname.startsWith("/super-admin");
  const isSuperAdminApi = pathname.startsWith("/api/super-admin");

  if (isSuperAdminRoute || isSuperAdminApi) {
    if (token.role !== "superadmin") {
      if (isSuperAdminApi) {
        return NextResponse.json(
          { error: "Access denied. Super administrator rights required." },
          { status: 403 }
        );
      }
      // Silently send normal shop users to dashboard
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.svg, manifest.json, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json|robots.txt).*)",
  ],
};
