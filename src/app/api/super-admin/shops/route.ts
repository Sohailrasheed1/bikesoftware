import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { errorResponse } = await authorizeRequest(request, { requireSuperAdmin: true });
    if (errorResponse) return errorResponse;

    const shops = await db.getShops();
    return NextResponse.json(shops);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { errorResponse } = await authorizeRequest(request, { requireSuperAdmin: true });
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { name, urduName, ownerName, phone, address, city, monthlyRent, billingCycle, subscriptionEnd, adminUsername, adminPassword, seedSampleParts, notes } = body;

    if (!name || !adminUsername || !adminPassword) {
      return NextResponse.json(
        { error: "Dukan ka naam, username, aur password lazmi hain." },
        { status: 400 }
      );
    }

    if (typeof adminPassword !== "string" || adminPassword.length < 8) {
      return NextResponse.json(
        { error: "Password kam az kam 8 characters ka hona chahiye." },
        { status: 400 }
      );
    }

    const result = await db.createShop(
      {
        name,
        urduName,
        ownerName: ownerName || name,
        phone: phone || "",
        address: address || "",
        city: city || "Karachi",
        monthlyRent: Number(monthlyRent) || 0,
        billingCycle: billingCycle || "monthly",
        status: "active",
        subscriptionStart: new Date().toISOString(),
        subscriptionEnd: subscriptionEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        notes: notes || "",
        slug: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      },
      {
        username: adminUsername,
        password: adminPassword,
        name: ownerName || name,
        email: `${adminUsername.toLowerCase().trim()}@bikesoftware.pk`,
      },
      Boolean(seedSampleParts !== false)
    );

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
