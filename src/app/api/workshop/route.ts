import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getTenantShopId } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const shopId = await getTenantShopId(request);
    const jobCards = await db.getJobCards(shopId);
    return NextResponse.json(jobCards);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const shopId = await getTenantShopId(request);
    const body = await request.json();
    const newCard = await db.createJobCard(body, shopId);
    return NextResponse.json(newCard, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
