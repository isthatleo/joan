import { NextRequest, NextResponse } from "next/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { requireTenantAdmin } from "@/lib/tenant-staff";
import { getPharmacyData } from "../route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const data = await getPharmacyData(tenantId, request);
    return NextResponse.json({
      totalMedications: data.stats.inventoryItems,
      lowStockItems: data.stats.lowStock,
      pendingPrescriptions: data.stats.pending,
      dispensedToday: data.stats.filledToday,
      drugInteractionsCritical: data.stats.criticalInteractions,
      outOfStockItems: data.stats.outOfStock,
      targetedRevenue: 0,
      stockAlerts: data.inventoryAlerts.length,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Error fetching pharmacy dashboard metrics:", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}
