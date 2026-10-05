import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requiredPermission: "reports",
      requireViewSalesAndProfit: true,
    });
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const billId = searchParams.get("billId") || undefined;
    const partId = searchParams.get("partId") || undefined;
    const details = await db.getSaleDetails(billId, partId, auth.shopId);
    return NextResponse.json(details);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

