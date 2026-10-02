import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getTenantShopId } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const shopId = await getTenantShopId(request);
    const body = await request.json();

    if (!body.partId || body.quantity === undefined) {
      return NextResponse.json(
        { error: "partId and quantity are required." },
        { status: 400 }
      );
    }

    if (body.type === "purchase_return") {
      const result = await db.recordPurchaseReturn(body, shopId);
      return NextResponse.json(result, { status: 201 });
    } else {
      const result = await db.recordStockAdjustment(body, shopId);
      return NextResponse.json(result, { status: 201 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
