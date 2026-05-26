import { NextRequest, NextResponse } from "next/server";
import { announceQueueDestination, getTenantBySlug, updateReceptionQueueStatus } from "@/lib/receptionist/data";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; patientId: string }> },
) {
  try {
    const { slug, patientId: queueId } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const queue = await updateReceptionQueueStatus(tenant.id, queueId, "called");
    const announcement = await announceQueueDestination(tenant.id, queueId, "the front desk");
    return NextResponse.json({ success: true, queue, announcement, message: "Patient called successfully" });
  } catch (error) {
    console.error("Failed to call patient:", error);
    return NextResponse.json({ error: "Failed to call patient" }, { status: 500 });
  }
}
