import { NextRequest, NextResponse } from "next/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { listStockAlerts } from "@/lib/pharmacy/data";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    const data = await listStockAlerts(tenantId);
    const alerts = data.alerts.map((alert: any) => ({
      id: alert.id,
      medicationId: alert.itemId,
      medicationName: alert.name,
      currentStock: alert.stock,
      minStock: alert.minStock || 0,
      reorderQuantity: alert.reorderQuantity || 0,
      supplier: alert.supplier || "",
      alertType: alert.type,
      isActive: alert.status !== "resolved",
      createdAt: alert.createdAt || new Date().toISOString(),
    }));

    return NextResponse.json(type === "all" ? alerts : alerts.filter((item: any) => item.alertType === type), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Error fetching stock alerts:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}
