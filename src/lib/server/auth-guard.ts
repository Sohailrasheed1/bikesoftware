import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DEFAULT_SHOP_ID } from "./db";
import { NextResponse } from "next/server";
import {
  UserRole,
  UserPermissions,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
} from "@/types";

export interface AuthenticatedUser {
  id: string;
  username: string;
  name?: string;
  role: UserRole;
  shopId: string;
  shopName?: string;
  permissions: UserPermissions;
}

export interface AuthContext {
  user: AuthenticatedUser;
  shopId: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isStaff: boolean;
  hasPermission: (perm: keyof UserPermissions) => boolean;
}

export interface AuthGuardOptions {
  requiredRole?: UserRole | UserRole[];
  requiredPermission?: keyof UserPermissions | (keyof UserPermissions)[];
  requireAdmin?: boolean; // Must be admin or superadmin
  requireSuperAdmin?: boolean; // Must be superadmin only
  requireViewSalesAndProfit?: boolean; // Must have viewSalesAndProfit permission
}

export type AuthResult =
  | { auth: AuthContext; errorResponse: null }
  | { auth: null; errorResponse: NextResponse };

/**
 * Authorizes an incoming API request using server-side session authority.
 * Never trusts client headers or query parameters for identity/role/shop.
 */
export async function authorizeRequest(
  request: Request,
  options?: AuthGuardOptions
): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return {
        auth: null,
        errorResponse: NextResponse.json(
          { error: "Unauthorized. Barahe karam pehle login karein." },
          { status: 401 }
        ),
      };
    }

    const sessionUser = session.user as any;
    const rawRole = sessionUser.role;

    // Validate role against known roles
    if (!rawRole || !["superadmin", "admin", "staff"].includes(rawRole)) {
      return {
        auth: null,
        errorResponse: NextResponse.json(
          { error: "Access denied. Invalid or unrecognized user role." },
          { status: 403 }
        ),
      };
    }

    const role: UserRole = rawRole;
    const isSuperAdmin = role === "superadmin";
    const isAdmin = role === "admin" || isSuperAdmin;
    const isStaff = role === "staff";

    // Resolve shopId
    let shopId = sessionUser.shopId || DEFAULT_SHOP_ID;

    // Check query params & headers for cross-shop tampering (supports shopId, tenantId, shop, tenant variations)
    const url = new URL(request.url);
    const queryShopId =
      url.searchParams.get("shopId") ||
      url.searchParams.get("tenantId") ||
      url.searchParams.get("shop") ||
      url.searchParams.get("tenant");

    const headerShopId =
      request.headers.get("x-shop-id") ||
      request.headers.get("x-tenant-id") ||
      request.headers.get("x-shop") ||
      request.headers.get("shop-id") ||
      request.headers.get("tenant-id");

    if (isSuperAdmin) {
      // Superadmin is allowed to inspect any tenant shop
      if (queryShopId) {
        shopId = queryShopId;
      } else if (headerShopId) {
        shopId = headerShopId;
      }
    } else {
      // For non-superadmin: NEVER trust client shopId.
      // If client attempts to inject a different shopId, REJECT with 403!
      if (
        (queryShopId && queryShopId !== shopId) ||
        (headerShopId && headerShopId !== shopId)
      ) {
        return {
          auth: null,
          errorResponse: NextResponse.json(
            { error: "Access denied. Aap kisi doosri dukan ka data access nahi kar sakte." },
            { status: 403 }
          ),
        };
      }
    }

    // Resolve permissions from session (server authority)
    let permissions: UserPermissions;
    if (isAdmin) {
      permissions = DEFAULT_ADMIN_PERMISSIONS;
    } else {
      const userPerms = sessionUser.permissions;
      permissions =
        userPerms && typeof userPerms === "object"
          ? { ...DEFAULT_STAFF_PERMISSIONS, ...userPerms }
          : DEFAULT_STAFF_PERMISSIONS;
    }

    const authContext: AuthContext = {
      user: {
        id: sessionUser.id || sessionUser.sub || "",
        username: sessionUser.username || sessionUser.name || "",
        name: sessionUser.name,
        role,
        shopId,
        shopName: sessionUser.shopName,
        permissions,
      },
      shopId,
      isAdmin,
      isSuperAdmin,
      isStaff,
      hasPermission: (perm: keyof UserPermissions) =>
        isAdmin || Boolean(permissions[perm]),
    };

    // 1. Check SuperAdmin requirement
    if (options?.requireSuperAdmin && !isSuperAdmin) {
      return {
        auth: null,
        errorResponse: NextResponse.json(
          { error: "Access denied. Sirf Platform Super Admin is operation ki ijazat rakhta hai." },
          { status: 403 }
        ),
      };
    }

    // 2. Check Admin requirement
    if (options?.requireAdmin && !isAdmin) {
      return {
        auth: null,
        errorResponse: NextResponse.json(
          { error: "Access denied. Sirf dukan ka malik (Admin) is operation ki ijazat rakhta hai." },
          { status: 403 }
        ),
      };
    }

    // 3. Check Role requirement
    if (options?.requiredRole) {
      const allowedRoles = Array.isArray(options.requiredRole)
        ? options.requiredRole
        : [options.requiredRole];
      if (!allowedRoles.includes(role)) {
        return {
          auth: null,
          errorResponse: NextResponse.json(
            { error: "Access denied. Aapka role is operation ke liye authorized nahi hai." },
            { status: 403 }
          ),
        };
      }
    }

    // 4. Check View Sales And Profit requirement
    if (
      options?.requireViewSalesAndProfit &&
      !authContext.hasPermission("viewSalesAndProfit")
    ) {
      return {
        auth: null,
        errorResponse: NextResponse.json(
          { error: "Access denied. Sales aur munafa ka data dekhne ki ijazat nahi hai." },
          { status: 403 }
        ),
      };
    }

    // 5. Check Module Permission requirement
    if (options?.requiredPermission) {
      if (!isAdmin) {
        const perms = Array.isArray(options.requiredPermission)
          ? options.requiredPermission
          : [options.requiredPermission];
        // User must have AT LEAST ONE of the required permissions
        const hasAccess = perms.some((p) => Boolean(permissions[p]));
        if (!hasAccess) {
          return {
            auth: null,
            errorResponse: NextResponse.json(
              { error: "Access denied. Aapko is module ki ijazat nahi hai." },
              { status: 403 }
            ),
          };
        }
      }
    }

    return { auth: authContext, errorResponse: null };
  } catch (err: any) {
    console.error("Authorization check error:", err);
    return {
      auth: null,
      errorResponse: NextResponse.json(
        { error: "Internal Server Error during authorization." },
        { status: 500 }
      ),
    };
  }
}

/**
 * Validates request payload for cross-tenant injection.
 * Prevents non-superadmin clients from specifying a different shopId in request body.
 */
export function validateBodySecurity(
  body: any,
  auth: AuthContext
): NextResponse | null {
  if (!body || typeof body !== "object") return null;

  // Cross-shop tenant tampering check (shopId, tenantId, shop, tenant)
  if (!auth.isSuperAdmin) {
    const injectedShopId = body.shopId || body.tenantId || body.shop || body.tenant;
    if (injectedShopId && injectedShopId !== auth.shopId) {
      return NextResponse.json(
        { error: "Access denied. Kisi doosri dukan ka shopId pass karne ki ijazat nahi hai." },
        { status: 403 }
      );
    }
  }

  return null;
}

// Backward compatibility alias
export const validateBodyShopId = validateBodySecurity;

/**
 * Strips tenant and role identifiers from generic resource update objects
 * so resource documents can never be moved across shops via PUT/PATCH.
 */
export function sanitizePayloadUpdates<T extends Record<string, any>>(updates: T): T {
  if (!updates || typeof updates !== "object") return updates;
  const sanitized = { ...updates };
  delete sanitized.shopId;
  delete sanitized.tenantId;
  delete sanitized.shop;
  delete sanitized.tenant;
  delete sanitized.role;
  delete sanitized.permissions;
  return sanitized;
}

