import { NextRequest, NextResponse } from "next/server";
import { QueueService } from "@/lib/services/queue.service";

const service = new QueueService();

export async function POST(request: NextRequest) {
  try {
    const { tenantId, departmentId } = await request.json();
    const next = await service.callNext(tenantId, departmentId);
    return NextResponse.json({ next });
  } catch (error) {
    return NextResponse.json({ error: "Failed to call next patient" }, { status: 500 });
  }
}
