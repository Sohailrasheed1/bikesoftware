import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requiredPermission: ["bills", "pos"],
    });
    if (errorResponse) return errorResponse;

    const bill = await db.getBill(params.id, auth.shopId);
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (!auth.hasPermission("viewSalesAndProfit")) {
      const sanitized = {
        ...bill,
        items: bill.items.map((item) => {
          const { itemProfit, purchasePrice, batchDeductions, ...restItem } = item;
          return restItem;
        }),
      };
      return NextResponse.json(sanitized);
    }

    return NextResponse.json(bill);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requireAdmin: true,
    });
    if (errorResponse) return errorResponse;

    await db.deleteBill(params.id, auth.shopId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const isNotFound = err.message?.includes("not found") || err.message?.includes("nahi mila");
    const status = isNotFound ? 404 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

