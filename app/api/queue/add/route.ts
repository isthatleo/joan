import { NextRequest, NextResponse } from "next/server";
import { QueueService } from "@/lib/services/queue.service";

const service = new QueueService();

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    await service.add(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add to queue" }, { status: 500 });
  }
}
