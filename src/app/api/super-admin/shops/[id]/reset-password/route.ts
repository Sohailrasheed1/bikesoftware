import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { newPassword } = await request.json();
    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters long." }, { status: 400 });
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
