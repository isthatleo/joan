import { NextRequest, NextResponse } from "next/server";
import { PharmacyService } from "@/lib/services/pharmacy.service";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { requirePharmacistOrAdmin } from "@/lib/tenant-staff";

const pharmacyService = new PharmacyService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const authCheck = await requirePharmacistOrAdmin(request.headers, tenantId);
    if (!authCheck.ok) return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;
    const lowStock = searchParams.get("lowStock") === "true";
    const expiringSoon = searchParams.get("expiringSoon") === "true";

    const inventory = await pharmacyService.getInventory(tenantId, {
      category: category && category !== "all" ? category : undefined,
      search: search || undefined,
      lowStock,
      expiringSoon,
    });

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}
