import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getTenantShopId } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const shopId = await getTenantShopId(request);
    const mechanics = await db.getMechanics(shopId);
    return NextResponse.json(mechanics);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const shopId = await getTenantShopId(request);
    const body = await request.json();
    const newMechanic = await db.createMechanic(body, shopId);
    return NextResponse.json(newMechanic, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
