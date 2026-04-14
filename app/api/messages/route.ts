import { NextRequest, NextResponse } from "next/server";
import { MessagingService } from "@/lib/services/messaging.service";

const service = new MessagingService();

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const message = await service.sendMessage(data);
    return NextResponse.json(message);
  } catch (error) {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
