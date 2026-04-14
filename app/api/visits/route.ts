import { NextRequest, NextResponse } from "next/server";
import { VisitService } from "@/lib/services/visit.service";

const service = new VisitService();

export async function GET(request: NextRequest) {
  try {
    const visits = await service.getPatientVisits("patient-id");
    return NextResponse.json(visits);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch visits" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const visit = await service.createVisit(data);
    return NextResponse.json(visit);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create visit" }, { status: 500 });
  }
}
