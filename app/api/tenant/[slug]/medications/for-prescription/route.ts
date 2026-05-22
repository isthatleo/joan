import { NextRequest, NextResponse } from "next/server";
import { PharmacyService } from "@/lib/services/pharmacy.service";

const pharmacyService = new PharmacyService();

// GET /api/tenant/[slug]/medications/for-prescription - Get medications with stock status for prescription
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const resolvedParams = await params;
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = resolvedParams.slug;
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
