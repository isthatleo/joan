import { NextRequest, NextResponse } from "next/server";
import { getReceptionQueueStats, getTenantBySlug, requireReceptionistAccess } from "@/lib/receptionist/data";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const access = await requireReceptionistAccess(request, tenant.id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const stats = await getReceptionQueueStats(tenant.id);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to fetch queue stats:", error);
    return NextResponse.json({ error: "Failed to fetch queue stats" }, { status: 500 });
  }
}
