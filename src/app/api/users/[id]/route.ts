import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getTenantShopId } from "@/lib/server/tenant";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const callerRole = (session.user as any).role;
    if (callerRole !== "admin" && callerRole !== "superadmin") {
      return NextResponse.json(
        { error: "Access denied. Sirf dukan ka malik (Admin) user update kar sakta hai." },
        { status: 403 }
      );
    }

    const authorizedShopId = await getTenantShopId(request);
    const userId = decodeURIComponent(params.id);
    const body = await request.json();

    // Direct superadmin modification protection:
    const cleanParamId = userId.toLowerCase().trim();
    if (callerRole !== "superadmin" && (cleanParamId === "superadmin" || cleanParamId === "superadmin-1")) {
      return NextResponse.json(
        { error: "Access denied. Superadmin account ko tabdeel karne ki ijazat nahi hai." },
        { status: 403 }
      );
    }

    // 1. Cross-shop manipulation / moving user prevention:
    // If shop admin attempts to pass a different shopId in body, query, or headers: DENY
    if (callerRole !== "superadmin") {
      const url = new URL(request.url);
      const queryShopId = url.searchParams.get("shopId");
      const headerShopId = request.headers.get("x-shop-id");
      const requestedShopId = body.shopId || queryShopId || headerShopId;

      if (requestedShopId && requestedShopId !== authorizedShopId) {
        return NextResponse.json(
          { error: "Access denied. User ki dukan (shop) tabdeel karne ki ijazat nahi hai." },
          { status: 403 }
        );
      }
    }

    // 2. Role escalation prevention:
    // Shop admin cannot promote anyone to superadmin or assign unauthorized roles
    if (callerRole !== "superadmin" && body.role !== undefined) {
      if (body.role === "superadmin" || !["admin", "staff"].includes(body.role)) {
        return NextResponse.json(
          { error: "Access denied. Shop admin superadmin ya unauthorized platform role assign nahi kar sakta." },
          { status: 403 }
        );
      }
    }

    if (body.password !== undefined && body.password !== "") {
      if (typeof body.password !== "string" || body.password.length < 8) {
        return NextResponse.json(
          { error: "Password kam az kam 8 characters ka hona chahiye." },
          { status: 400 }
        );
      }
    }

    const isSuperAdmin = callerRole === "superadmin";
    const targetShopId = isSuperAdmin && body.shopId ? body.shopId : authorizedShopId;

    const updated = await db.updateUserForShop(
      userId,
      {
        name: body.name,
        email: body.email,
        password: body.password,
        role: body.role,
        permissions: body.permissions,
      },
      targetShopId,
      isSuperAdmin
    );

    return NextResponse.json(updated);
  } catch (err: any) {
    const isNotFound = err.message?.includes("nahi mila") || err.message?.includes("talluq nahi rakhta");
    const isForbidden = err.message?.includes("Access denied") || err.message?.includes("ijazat nahi");
    const status = isForbidden ? 403 : isNotFound ? 404 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const callerRole = (session.user as any).role;
    if (callerRole !== "admin" && callerRole !== "superadmin") {
      return NextResponse.json(
        { error: "Access denied. Sirf dukan ka malik (Admin) user delete kar sakta hai." },
        { status: 403 }
      );
    }

    const currentUserId = (session.user as any).id || (session.user as any).username;
    const authorizedShopId = await getTenantShopId(request);
    const userId = decodeURIComponent(params.id);

    // Direct superadmin deletion protection:
    const cleanParamId = userId.toLowerCase().trim();
    if (cleanParamId === "superadmin" || cleanParamId === "superadmin-1") {
      return NextResponse.json(
        { error: "Access denied. Superadmin account ko delete karne ki ijazat nahi hai." },
        { status: 403 }
      );
    }

    // If shop admin passes different shopId in query/headers: DENY
    if (callerRole !== "superadmin") {
      const url = new URL(request.url);
      const queryShopId = url.searchParams.get("shopId");
      const headerShopId = request.headers.get("x-shop-id");
      if ((queryShopId && queryShopId !== authorizedShopId) || (headerShopId && headerShopId !== authorizedShopId)) {
        return NextResponse.json(
          { error: "Access denied. Aap kisi doosri dukan ka user delete nahi kar sakte." },
          { status: 403 }
        );
      }
    }

    const isSuperAdmin = callerRole === "superadmin";

    await db.deleteShopUser(userId, authorizedShopId, currentUserId, isSuperAdmin);
    return NextResponse.json({ success: true, message: "User kamyabi se delete ho gaya." });
  } catch (err: any) {
    const isNotFound = err.message?.includes("nahi mila") || err.message?.includes("talluq nahi rakhta");
    const isForbidden = err.message?.includes("Access denied") || err.message?.includes("ijazat nahi");
    const status = isForbidden ? 403 : isNotFound ? 404 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
