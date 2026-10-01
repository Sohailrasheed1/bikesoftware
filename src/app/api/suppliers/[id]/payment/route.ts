import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getTenantShopId } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const shopId = await getTenantShopId(request);
    const body = await request.json();
    const { amount, notes } = body;
    const updated = await db.recordSupplierPayment(params.id, Number(amount), notes, shopId);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
