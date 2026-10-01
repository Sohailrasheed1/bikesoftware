import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { status } = await request.json();
    if (!["active", "suspended", "expired"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
    }
    const updated = await db.updateShopStatus(params.id, status as any);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
