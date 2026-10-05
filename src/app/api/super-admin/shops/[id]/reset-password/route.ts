import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { errorResponse } = await authorizeRequest(request, { requireSuperAdmin: true });
    if (errorResponse) return errorResponse;

    const { newPassword } = await request.json();
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ error: "Password kam az kam 8 characters ka hona chahiye." }, { status: 400 });
    }
    const success = await db.resetShopAdminPassword(params.id, newPassword);
    if (!success) {
      return NextResponse.json({ error: "No admin user found for this shop." }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
