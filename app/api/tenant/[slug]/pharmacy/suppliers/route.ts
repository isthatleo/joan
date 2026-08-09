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
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");

    const suppliers = await pharmacyService.getSuppliers(tenantId, {
      search: search || undefined,
      isActive: isActive ? isActive === "true" : undefined,
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}
