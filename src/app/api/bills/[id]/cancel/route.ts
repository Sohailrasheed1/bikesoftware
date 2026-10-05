import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requireAdmin: true,
    });
    if (errorResponse) return errorResponse;

    const success = await db.cancelBill(params.id, auth.shopId);
    return NextResponse.json({ success });
  } catch (err: any) {
    const isNotFound = err.message?.includes("not found") || err.message?.includes("nahi mila");
    const status = isNotFound ? 404 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

