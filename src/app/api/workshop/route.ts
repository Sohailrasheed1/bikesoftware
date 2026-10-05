import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest, validateBodyShopId } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requiredPermission: "workshop",
    });
    if (errorResponse) return errorResponse;

    const jobCards = await db.getJobCards(auth.shopId);
    return NextResponse.json(jobCards);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requiredPermission: "workshop",
    });
    if (errorResponse) return errorResponse;

    const body = await request.json();

    const bodyShopError = validateBodyShopId(body, auth);
    if (bodyShopError) return bodyShopError;

    const newCard = await db.createJobCard(body, auth.shopId);
    return NextResponse.json(newCard, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

