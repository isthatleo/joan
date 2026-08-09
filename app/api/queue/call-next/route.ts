import { NextRequest, NextResponse } from "next/server";
import { QueueService } from "@/lib/services/queue.service";
import { requireAppUser } from "@/lib/api/route-guards";

const service = new QueueService();

export async function POST(request: NextRequest) {
  try {
    const { tenantId, departmentId } = await request.json();
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const access = await requireAppUser(request);
    if (!access.ok) return access.response;
    if (access.user.role !== "super_admin" && access.user.tenantId !== tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const next = await service.callNext(tenantId, departmentId);
    return NextResponse.json({ next });
  } catch (error) {
    return NextResponse.json({ error: "Failed to call next patient" }, { status: 500 });
  }
}
