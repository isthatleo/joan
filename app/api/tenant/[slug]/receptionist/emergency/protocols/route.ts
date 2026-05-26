import { NextRequest, NextResponse } from "next/server";
import { getEmergencyProtocols, getTenantBySlug } from "@/lib/receptionist/data";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const protocols = await getEmergencyProtocols(tenant.id);
    return NextResponse.json(protocols);
  } catch (error) {
    console.error("Failed to fetch emergency protocols:", error);
    return NextResponse.json({ error: "Failed to fetch emergency protocols" }, { status: 500 });
  }
}
