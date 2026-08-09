import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug, getWaitingRoomPatients, requireReceptionistAccess } from "@/lib/receptionist/data";

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

    const patients = await getWaitingRoomPatients(tenant.id);
    return NextResponse.json(patients);
  } catch (error) {
    console.error("Failed to fetch waiting room patients:", error);
    return NextResponse.json({ error: "Failed to fetch waiting room patients" }, { status: 500 });
  }
}
