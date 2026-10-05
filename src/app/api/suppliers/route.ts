import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest, validateBodyShopId } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requiredPermission: "suppliers",
    });
    if (errorResponse) return errorResponse;

    const credits = await db.getSupplierCredits(auth.shopId);
    return NextResponse.json(credits);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requiredPermission: "suppliers",
    });
    if (errorResponse) return errorResponse;

    const body = await request.json();

    const bodyShopError = validateBodyShopId(body, auth);
    if (bodyShopError) return bodyShopError;

    const newCredit = await db.createSupplierCredit(body, auth.shopId);
    return NextResponse.json(newCredit, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

