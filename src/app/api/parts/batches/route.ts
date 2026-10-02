import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getTenantShopId } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const shopId = await getTenantShopId(request);
    const { searchParams } = new URL(request.url);
    const partId = searchParams.get("partId") || undefined;
    const batches = await db.getPurchaseBatches(partId, shopId);
    return NextResponse.json(batches);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const shopId = await getTenantShopId(request);
    const body = await request.json();
    if (!body.partId || !body.qtyPurchased || body.costPrice === undefined || !body.supplier) {
      return NextResponse.json(
        { error: "partId, qtyPurchased, costPrice, and supplier are required." },
        { status: 400 }
      );
    }
    const batch = await db.createPurchaseBatch(body, shopId);
    return NextResponse.json(batch, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
