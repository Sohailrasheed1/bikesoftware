import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getTenantShopId } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const shopId = await getTenantShopId(request);
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get("billId") || undefined;
    const partId = searchParams.get("partId") || undefined;
    const details = await db.getSaleDetails(billId, partId, shopId);
    return NextResponse.json(details);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
