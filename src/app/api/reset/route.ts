import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getTenantShopId } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const shopId = await getTenantShopId(request);
    await db.resetToSampleData(shopId);
    return NextResponse.json({ success: true, message: "Shop data reset successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
