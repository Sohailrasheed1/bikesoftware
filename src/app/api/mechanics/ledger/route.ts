import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getTenantShopId } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const shopId = await getTenantShopId(request);
    const { searchParams } = new URL(request.url);
    const mechanicId = searchParams.get("mechanicId") || undefined;
    const ledger = await db.getMechanicLedger(mechanicId, shopId);
    return NextResponse.json(ledger);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
