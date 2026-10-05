import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest, validateBodySecurity, sanitizePayloadUpdates } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requiredPermission: ["mechanics", "workshop"],
    });
    if (errorResponse) return errorResponse;

    const mechanic = await db.getMechanic(params.id, auth.shopId);
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
    const { auth, errorResponse } = await authorizeRequest(request, {
      requiredPermission: "mechanics",
    });
    if (errorResponse) return errorResponse;

    const updates = await request.json();
    const bodyError = validateBodySecurity(updates, auth);
    if (bodyError) return bodyError;

    const sanitizedUpdates = sanitizePayloadUpdates(updates);
    const updated = await db.updateMechanic(params.id, sanitizedUpdates, auth.shopId);
    return NextResponse.json(updated);
  } catch (err: any) {
    const isNotFound = err.message?.includes("not found") || err.message?.includes("nahi mila");
    const status = isNotFound ? 404 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requireAdmin: true,
    });
    if (errorResponse) return errorResponse;

    await db.deleteMechanic(params.id, auth.shopId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const isNotFound = err.message?.includes("not found") || err.message?.includes("nahi mila");
    const status = isNotFound ? 404 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

