import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function resolveAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (secret) return secret;
  // Middleware cannot throw on every request in misconfigured prod without locking the site out of /login.
  // Auth options already hard-fail without NEXTAUTH_SECRET in production.
  if (process.env.NODE_ENV === "production") {
    return "";
  }
  return "skander_spare_parts_super_secret_jwt_key_2026_xyz";
}

export async function middleware(req: NextRequest) {
  const effectiveSecret = resolveAuthSecret();

  // Misconfigured production: block everything except login + public assets/auth
  if (!effectiveSecret && process.env.NODE_ENV === "production") {
    const { pathname } = req.nextUrl;
    const allowWithoutSecret =
      pathname === "/login" ||
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/_next") ||
      pathname === "/manifest.json" ||
      pathname === "/sw.js" ||
      pathname === "/offline.html" ||
      pathname === "/robots.txt" ||
      pathname === "/api/app-version" ||
      pathname.endsWith(".png") ||
      pathname.endsWith(".jpg") ||
      pathname.endsWith(".jpeg") ||
      pathname.endsWith(".svg") ||
      pathname.endsWith(".ico") ||
      pathname.endsWith(".webp");

    if (!allowWithoutSecret) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Server misconfigured: NEXTAUTH_SECRET is required." },
          { status: 503 }
        );
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  // Reliably inspect both HTTPS secure cookie and HTTP standard cookie formats on Vercel
  const hasSecureCookie = req.cookies.has("__Secure-next-auth.session-token");
  let token = await getToken({
    req,
    secret: effectiveSecret,
    secureCookie: hasSecureCookie,
  });

  if (!token) {
    token = await getToken({
      req,
      secret: effectiveSecret,
      secureCookie: !hasSecureCookie,
    });
  }

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

    // For all protected pages, redirect to /login with callbackUrl (never set callbackUrl to /login)
    const loginUrl = new URL("/login", req.url);
    const callbackPath = `${pathname}${search || ""}`;
    if (pathname !== "/" && !pathname.startsWith("/login")) {
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
