import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest, validateBodyShopId } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requiredPermission: "inventory",
    });
    if (errorResponse) return errorResponse;

    const body = await request.json();

    const bodyShopError = validateBodyShopId(body, auth);
    if (bodyShopError) return bodyShopError;

    if (!body.partId || body.quantity === undefined) {
      return NextResponse.json(
        { error: "partId and quantity are required." },
        { status: 400 }
      );
    }

    if (body.type === "purchase_return") {
      const result = await db.recordPurchaseReturn(body, auth.shopId);
      return NextResponse.json(result, { status: 201 });
    } else {
      const result = await db.recordStockAdjustment(body, auth.shopId);
      return NextResponse.json(result, { status: 201 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

