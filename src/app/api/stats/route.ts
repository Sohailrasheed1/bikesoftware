import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request);
    if (errorResponse) return errorResponse;

    // Staff without any active permissions must be rejected
    if (!auth.isAdmin && !Object.values(auth.user.permissions).some(Boolean)) {
      return NextResponse.json(
        { error: "Access denied. Aapke paas dashboard ya stats dekhne ki ijazat nahi hai." },
        { status: 403 }
      );
    }

    const stats = await db.getDashboardStats(auth.shopId);

    // If user does not have permission to view sales and profit, mask sensitive financial fields
    if (!auth.hasPermission("viewSalesAndProfit")) {
      stats.todaySales = 0;
      stats.monthlySales = 0;
      stats.totalInventoryValue = 0;
      stats.totalPendingSupplierCredit = 0;
      stats.totalMechanicPayable = 0;
    }

    return NextResponse.json(stats);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

