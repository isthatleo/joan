import { NextRequest, NextResponse } from "next/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { buildPharmacyReports } from "@/lib/pharmacy/data";
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
    const reports = await buildPharmacyReports(tenantId);
    const payload = [
      ...reports.templates.map((template) => ({
        id: template.id,
        title: template.name,
        description: template.description,
        type: template.id,
        status: "template",
        generatedAt: null,
        dataPoints: reports.preview.prescriptions.length + reports.preview.inventory.length,
        summary: `${reports.preview.prescriptions.length} prescriptions and ${reports.preview.inventory.length} inventory items included`,
      })),
      ...reports.recentRuns,
    ];

    return NextResponse.json(type === "all" ? payload : payload.filter((item: any) => item.type === type), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Error fetching pharmacy reports:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
