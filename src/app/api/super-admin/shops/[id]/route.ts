import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { errorResponse } = await authorizeRequest(request, { requireSuperAdmin: true });
    if (errorResponse) return errorResponse;

    const shop = await db.getShop(params.id);
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }
    const users = await db.getUsersByShop(params.id);
    return NextResponse.json({ shop, users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { errorResponse } = await authorizeRequest(request, { requireSuperAdmin: true });
    if (errorResponse) return errorResponse;

    const updates = await request.json();
    const updated = await db.updateShop(params.id, updates);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { errorResponse } = await authorizeRequest(request, { requireSuperAdmin: true });
    if (errorResponse) return errorResponse;

    await db.deleteShop(params.id);
    return NextResponse.json({ success: true, message: "Shop and all associated data deleted successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

