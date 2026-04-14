import { NextRequest, NextResponse } from "next/server";
import { LabService } from "@/lib/services/lab.service";

const service = new LabService();

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await service.uploadLabResult(data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to upload lab result" }, { status: 500 });
  }
}
