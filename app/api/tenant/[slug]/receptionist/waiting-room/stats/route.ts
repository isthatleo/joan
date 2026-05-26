import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug, getWaitingRoomStats } from "@/lib/receptionist/data";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const stats = await getWaitingRoomStats(tenant.id);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to fetch waiting room stats:", error);
    return NextResponse.json({ error: "Failed to fetch waiting room stats" }, { status: 500 });
  }
}
