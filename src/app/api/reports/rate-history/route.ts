import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getTenantShopId } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const shopId = await getTenantShopId(request);
    const { searchParams } = new URL(request.url);
    const partId = searchParams.get("partId") || undefined;
    const history = await db.getPurchaseRateHistory(partId, shopId);
    return NextResponse.json(history);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
