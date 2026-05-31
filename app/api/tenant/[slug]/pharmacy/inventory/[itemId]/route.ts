import { NextRequest, NextResponse } from "next/server";
import { PharmacyService } from "@/lib/services/pharmacy.service";
import { getTenantBySlug } from "@/lib/db/helpers";
import { requireTenantUser } from "@/lib/api/route-guards";

const pharmacyService = new PharmacyService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; itemId: string }> }
) {
  try {
    const { slug, itemId } = await params;
    const access = await requireTenantUser(request, ["pharmacist"]);
    if (!access.ok) return access.response;
    const tenant = await getTenantBySlug(slug);
    if (!tenant || tenant.id !== access.user.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const { status, quantity } = body;

    if (!status && quantity === undefined) {
      return NextResponse.json(
        { error: "Either status or quantity must be provided" },
        { status: 400 }
      );
    }

    let result;

    if (status) {
      result = await pharmacyService.updateStockStatus(slug, itemId, status);
    } else if (quantity !== undefined) {
      result = await pharmacyService.updateStockQuantity(slug, itemId, Number(quantity));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating stock:", error);
    return NextResponse.json(
      { error: "Failed to update stock" },
      { status: 500 }
    );
  }
}
