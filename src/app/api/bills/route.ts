import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest, validateBodyShopId } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requiredPermission: ["bills", "pos"],
    });
    if (errorResponse) return errorResponse;

    const bills = await db.getBills(auth.shopId);

    // If user lacks viewSalesAndProfit permission, sanitize profit margins & purchase costs
    if (!auth.hasPermission("viewSalesAndProfit")) {
      const sanitized = bills.map((b) => ({
        ...b,
        items: b.items.map((item) => {
          const { itemProfit, purchasePrice, batchDeductions, ...restItem } = item;
          return restItem;
        }),
      }));
      return NextResponse.json(sanitized);
    }

    return NextResponse.json(bills);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requiredPermission: "pos",
    });
    if (errorResponse) return errorResponse;

    const body = await request.json();

    // Prevent non-superadmin from injecting a different shopId in payload
    const bodyShopError = validateBodyShopId(body, auth);
    if (bodyShopError) return bodyShopError;

    const newBill = await db.createBill(body, auth.shopId);
    return NextResponse.json(newBill, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

