import { NextRequest, NextResponse } from "next/server";
import { QueueService } from "@/lib/services/queue.service";
import { requireTenantUser } from "@/lib/api/route-guards";

const service = new QueueService();

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantUser(request, ["receptionist", "nurse", "doctor"]);
    if (!access.ok) return access.response;

    const data = await request.json();
    await service.add({ ...data, tenantId: access.user.tenantId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add to queue" }, { status: 500 });
  }
}
