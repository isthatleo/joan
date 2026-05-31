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
    const alerts = [
      ...data.inventoryAlerts.map((item: any) => ({
        id: `stock-${item.id}`,
        type: item.outOfStock ? "error" : "warning",
        title: item.outOfStock ? "Out of Stock" : item.expiringSoon ? "Expiring Soon" : "Low Stock",
        message: `${item.name} has ${item.stock} units available${item.expiryDate ? `, expires ${new Date(item.expiryDate).toLocaleDateString()}` : ""}.`,
      })),
      ...data.prescriptions.filter((item: any) => item.interactions?.length || item.priority === "critical").map((item: any) => ({
        id: `interaction-${item.id}`,
        type: "error",
        title: "Medication Safety Review",
        message: `${item.patientName}'s ${item.medication || "prescription"} requires review.`,
      })),
    ];

    return NextResponse.json(alerts, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Error fetching pharmacy alerts:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}
