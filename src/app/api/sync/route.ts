import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest, validateBodyShopId } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request);
    if (errorResponse) return errorResponse;

    const clientData = await request.json();

    const bodyShopError = validateBodyShopId(clientData, auth);
    if (bodyShopError) return bodyShopError;

    const result = await db.syncClientData(clientData, auth.shopId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

