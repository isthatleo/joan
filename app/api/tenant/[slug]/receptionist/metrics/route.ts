import { NextRequest, NextResponse } from "next/server";
import { getReceptionDashboardMetrics, getTenantBySlug } from "@/lib/receptionist/data";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const metrics = await getReceptionDashboardMetrics(tenant.id);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Failed to fetch receptionist metrics:", error);
    return NextResponse.json({ error: "Failed to fetch receptionist metrics" }, { status: 500 });
  }
}
