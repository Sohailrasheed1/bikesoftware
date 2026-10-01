import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { getTenantShopId } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const shopId = await getTenantShopId(request);
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "addPart": {
        const { partId, quantity } = body;
        const updated = await db.addPartToJobCard(params.id, partId, Number(quantity) || 1, shopId);
        return NextResponse.json(updated);
      }
      case "updatePartQty": {
        const { partId, delta } = body;
        const updated = await db.updateJobCardPartQty(params.id, partId, Number(delta) || 0, shopId);
        return NextResponse.json(updated);
      }
      case "removePart": {
        const { partId } = body;
        const updated = await db.removePartFromJobCard(params.id, partId, shopId);
        return NextResponse.json(updated);
      }
      case "addLabour": {
        const { labour } = body;
        const updated = await db.addLabourToJobCard(params.id, labour, shopId);
        return NextResponse.json(updated);
      }
      case "removeLabour": {
        const { labourId } = body;
        const updated = await db.removeLabourFromJobCard(params.id, labourId, shopId);
        return NextResponse.json(updated);
      }
      case "complete": {
        const { paymentMethod, discount, notes } = body;
        const result = await db.completeJobCardAndGenerateBill(
          params.id,
          paymentMethod || "Cash",
          Number(discount) || 0,
          notes,
          shopId
        );
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
