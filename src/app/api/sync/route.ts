import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getTenantShopId } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const shopId = await getTenantShopId(request);
    const clientData = await request.json();
    const result = await db.syncClientData(clientData, shopId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
