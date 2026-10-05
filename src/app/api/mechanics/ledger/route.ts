import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requiredPermission: "mechanics",
    });
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const mechanicId = searchParams.get("mechanicId") || undefined;
    const ledger = await db.getMechanicLedger(mechanicId, auth.shopId);
    return NextResponse.json(ledger);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

