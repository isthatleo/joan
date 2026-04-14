import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/services/ai.service";

const service = new AIService();

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await service.summary(params.id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
