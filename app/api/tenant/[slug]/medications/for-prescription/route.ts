import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PharmacyService } from "@/lib/services/pharmacy.service";
import { getTenantIdBySlug, verifyTenantMembership } from "@/lib/accountant/server";

const pharmacyService = new PharmacyService();

// GET /api/tenant/[slug]/medications/for-prescription - Get medications with stock status for prescription
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const tenantId = await getTenantIdBySlug(resolvedParams.slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const membership = await verifyTenantMembership(session, tenantId);
    if (!membership.ok) {
      return NextResponse.json({ error: membership.status === 401 ? "Unauthorized" : "Forbidden" }, { status: membership.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;

    const medications = await pharmacyService.getMedicationsForPrescription(tenantId, search, category);

    return NextResponse.json({
      medications,
    });
  } catch (error) {
    console.error("Error fetching medications for prescription:", error);
    return NextResponse.json({ error: "Failed to fetch medications" }, { status: 500 });
  }
}
