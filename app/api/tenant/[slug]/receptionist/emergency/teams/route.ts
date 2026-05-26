import { NextRequest, NextResponse } from "next/server";
import { getEmergencyTeams, getTenantBySlug } from "@/lib/receptionist/data";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const teams = await getEmergencyTeams(tenant.id);
    return NextResponse.json(teams);
  } catch (error) {
    console.error("Failed to fetch emergency teams:", error);
    return NextResponse.json({ error: "Failed to fetch emergency teams" }, { status: 500 });
  }
}
