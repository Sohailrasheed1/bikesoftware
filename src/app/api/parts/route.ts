import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest, validateBodyShopId } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requiredPermission: ["inventory", "pos", "workshop"],
    });
    if (errorResponse) return errorResponse;

    const parts = await db.getParts(auth.shopId);

    // If staff lacks viewSalesAndProfit permission, mask purchase price
    if (!auth.hasPermission("viewSalesAndProfit")) {
      const sanitized = parts.map((p) => ({
        ...p,
        purchasePrice: 0,
      }));
      return NextResponse.json(sanitized);
    }

    return NextResponse.json(parts);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requiredPermission: "inventory",
    });
    if (errorResponse) return errorResponse;

    const body = await request.json();

    const bodyShopError = validateBodyShopId(body, auth);
    if (bodyShopError) return bodyShopError;

    const newPart = await db.createPart(body, auth.shopId);
    return NextResponse.json(newPart, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

