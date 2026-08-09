import { NextRequest, NextResponse } from "next/server";
import { getReceptionAlerts, getTenantBySlug, requireReceptionistAccess } from "@/lib/receptionist/data";

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

    const alerts = await getReceptionAlerts(tenant.id);
    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Failed to fetch receptionist alerts:", error);
    return NextResponse.json({ error: "Failed to fetch receptionist alerts" }, { status: 500 });
  }
}
