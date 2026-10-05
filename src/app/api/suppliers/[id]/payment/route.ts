import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest, validateBodySecurity } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requiredPermission: "suppliers",
    });
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const bodyError = validateBodySecurity(body, auth);
    if (bodyError) return bodyError;

    const { amount, notes } = body;
    const updated = await db.recordSupplierPayment(params.id, Number(amount), notes, auth.shopId);
    return NextResponse.json(updated);
  } catch (err: any) {
    const isNotFound = err.message?.includes("not found") || err.message?.includes("nahi mila");
    const status = isNotFound ? 404 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

