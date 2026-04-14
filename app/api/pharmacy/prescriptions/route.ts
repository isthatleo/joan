import { NextRequest, NextResponse } from "next/server";
import { PharmacyService } from "@/lib/services/pharmacy.service";

const service = new PharmacyService();

export async function GET(request: NextRequest) {
  try {
    const queue = await service.getPrescriptionQueue("tenant-id");
    return NextResponse.json(queue);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch prescription queue" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const prescription = await service.createPrescription(data);
    return NextResponse.json(prescription);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create prescription" }, { status: 500 });
  }
}
