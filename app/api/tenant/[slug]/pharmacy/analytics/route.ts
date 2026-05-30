import { NextRequest, NextResponse } from "next/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { listPharmacyAnalytics } from "@/lib/pharmacy/data";
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

    return NextResponse.json(await listPharmacyAnalytics(tenantId), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Error fetching tenant pharmacy analytics:", error);
    return NextResponse.json({ error: "Failed to fetch pharmacy analytics" }, { status: 500 });
  }
}
