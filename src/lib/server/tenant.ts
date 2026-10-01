import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DEFAULT_SHOP_ID } from "./db";
import { NextRequest } from "next/server";

/**
 * Resolves the active shopId for the current API request.
 * - For regular shop users (admin / staff): ALWAYS returns their own assigned shopId (strictly isolated).
 * - For superadmin: allows inspecting a specific shop via `?shopId=...` query param or `x-shop-id` header,
 *   or defaults to DEFAULT_SHOP_ID.
 */
export async function getTenantShopId(req?: Request | NextRequest): Promise<string> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return DEFAULT_SHOP_ID;
    }

    const user = session.user as any;
    if (user.role === "superadmin") {
      if (req) {
        try {
          const url = new URL(req.url);
          const queryShopId = url.searchParams.get("shopId");
          if (queryShopId) return queryShopId;
          const headerShopId = req.headers.get("x-shop-id");
          if (headerShopId) return headerShopId;
        } catch {
          // ignore url parse error
        }
      }
      return DEFAULT_SHOP_ID;
    }

    return user.shopId || DEFAULT_SHOP_ID;
  } catch (err) {
    console.error("Error resolving tenant shopId:", err);
    return DEFAULT_SHOP_ID;
  }
}
