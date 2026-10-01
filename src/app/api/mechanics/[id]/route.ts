import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getTenantShopId } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const shopId = await getTenantShopId(request);
    const mechanic = await db.getMechanic(params.id, shopId);
    if (!mechanic) {
      return NextResponse.json({ error: "Mechanic not found" }, { status: 404 });
    }
    return NextResponse.json(mechanic);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const shopId = await getTenantShopId(request);
    const updates = await request.json();
    const updated = await db.updateMechanic(params.id, updates, shopId);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const shopId = await getTenantShopId(request);
    await db.deleteMechanic(params.id, shopId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
