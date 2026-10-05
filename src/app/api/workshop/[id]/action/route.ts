import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { authorizeRequest, validateBodySecurity } from "@/lib/server/auth-guard";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { auth, errorResponse } = await authorizeRequest(request, {
      requiredPermission: "workshop",
    });
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const bodyError = validateBodySecurity(body, auth);
    if (bodyError) return bodyError;

    const { action } = body;

    switch (action) {
      case "addPart": {
        const { partId, quantity } = body;
        const updated = await db.addPartToJobCard(params.id, partId, Number(quantity) || 1, auth.shopId);
        return NextResponse.json(updated);
      }
      case "updatePartQty": {
        const { partId, delta } = body;
        const updated = await db.updateJobCardPartQty(params.id, partId, Number(delta) || 0, auth.shopId);
        return NextResponse.json(updated);
      }
      case "removePart": {
        const { partId } = body;
        const updated = await db.removePartFromJobCard(params.id, partId, auth.shopId);
        return NextResponse.json(updated);
      }
      case "addLabour": {
        const { labour } = body;
        const updated = await db.addLabourToJobCard(params.id, labour, auth.shopId);
        return NextResponse.json(updated);
      }
      case "removeLabour": {
        const { labourId } = body;
        const updated = await db.removeLabourFromJobCard(params.id, labourId, auth.shopId);
        return NextResponse.json(updated);
      }
      case "complete": {
        const { paymentMethod, discount, notes } = body;
        const result = await db.completeJobCardAndGenerateBill(
          params.id,
          paymentMethod || "Cash",
          Number(discount) || 0,
          notes,
          auth.shopId
        );
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    const isNotFound = err.message?.includes("not found") || err.message?.includes("nahi mila");
    const status = isNotFound ? 404 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

