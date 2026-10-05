import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest, validateBodyShopId } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requiredPermission: "inventory",
      requireViewSalesAndProfit: true,
    });
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const partId = searchParams.get("partId") || undefined;
    const batches = await db.getPurchaseBatches(partId, auth.shopId);
    return NextResponse.json(batches);
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

    if (!body.partId || !body.qtyPurchased || body.costPrice === undefined || !body.supplier) {
      return NextResponse.json(
        { error: "partId, qtyPurchased, costPrice, and supplier are required." },
        { status: 400 }
      );
    }
    const batch = await db.createPurchaseBatch(body, auth.shopId);
    return NextResponse.json(batch, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

