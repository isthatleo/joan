import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/services/ai.service";

const service = new AIService();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await service.summary(id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
