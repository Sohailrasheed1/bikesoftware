import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getTenantShopId } from "@/lib/server/tenant";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const callerRole = (session.user as any).role;
    if (callerRole !== "admin" && callerRole !== "superadmin") {
      return NextResponse.json(
        { error: "Access denied. Sirf dukan ka malik (Admin) users dekh sakta hai." },
        { status: 403 }
      );
    }

    const authorizedShopId = await getTenantShopId(request);

    // If non-superadmin explicitly passed a different shopId in query/header: DENY
    if (callerRole !== "superadmin") {
      const url = new URL(request.url);
      const queryShopId = url.searchParams.get("shopId");
      const headerShopId = request.headers.get("x-shop-id");
      if ((queryShopId && queryShopId !== authorizedShopId) || (headerShopId && headerShopId !== authorizedShopId)) {
        return NextResponse.json(
          { error: "Access denied. Aap kisi doosri dukan ka data access nahi kar sakte." },
          { status: 403 }
        );
      }
    }

    const users = await db.getUsersByShop(authorizedShopId);
    const sanitizedUsers = users.filter((u: any) => u.role !== "superadmin");
    return NextResponse.json(sanitizedUsers);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const callerRole = (session.user as any).role;
    if (callerRole !== "admin" && callerRole !== "superadmin") {
      return NextResponse.json(
        { error: "Access denied. Sirf dukan ka malik (Admin) naya user bana sakta hai." },
        { status: 403 }
      );
    }

    const authorizedShopId = await getTenantShopId(request);
    const body = await request.json();

    // 1. Cross-shop creation prevention:
    // If shop admin passes a different shopId in body, query, or headers: DENY
    if (callerRole !== "superadmin") {
      const url = new URL(request.url);
      const queryShopId = url.searchParams.get("shopId");
      const headerShopId = request.headers.get("x-shop-id");
      const requestedShopId = body.shopId || queryShopId || headerShopId;

      if (requestedShopId && requestedShopId !== authorizedShopId) {
        return NextResponse.json(
          { error: "Access denied. Aap kisi doosri dukan mein user create nahi kar sakte." },
          { status: 403 }
        );
      }
    }

    // 2. Role escalation & superadmin prevention:
    // Nobody can create a superadmin user via this endpoint
    const targetRole = body.role || "staff";
    if (targetRole === "superadmin" || !["admin", "staff"].includes(targetRole)) {
      return NextResponse.json(
        { error: "Access denied. Shop admin superadmin ya unauthorized platform role assign nahi kar sakta." },
        { status: 403 }
      );
    }

    const cleanUsername = String(body.username || "").toLowerCase().trim();
    if (cleanUsername === "superadmin") {
      return NextResponse.json(
        { error: "Access denied. Yeh username mehfooz (reserved) hai." },
        { status: 400 }
      );
    }

    if (!body.username || !body.name || !body.password) {
      return NextResponse.json(
        { error: "Username, Name aur Password darj karna zaroori hai." },
        { status: 400 }
      );
    }

    if (typeof body.password !== "string" || body.password.length < 8) {
      return NextResponse.json(
        { error: "Password kam az kam 8 characters ka hona chahiye." },
        { status: 400 }
      );
    }

    const isSuperAdmin = callerRole === "superadmin";
    const targetShopId = isSuperAdmin && body.shopId ? body.shopId : authorizedShopId;

    const newUser = await db.createUserForShop(
      {
        username: body.username,
        email: body.email,
        name: body.name,
        password: body.password,
        role: targetRole,
        permissions: body.permissions,
      },
      targetShopId,
      isSuperAdmin
    );

    return NextResponse.json(newUser, { status: 201 });
  } catch (err: any) {
    const isForbidden = err.message?.includes("Access denied") || err.message?.includes("ijazat nahi");
    const status = isForbidden ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
