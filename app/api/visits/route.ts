import { NextRequest, NextResponse } from "next/server";
import { VisitService } from "@/lib/services/visit.service";
import { requireTenantUser } from "@/lib/api/route-guards";

const service = new VisitService();

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantUser(request, ["doctor", "nurse", "hospital_admin", "patient", "guardian"]);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    const visits = await service.getPatientVisits(patientId);
    return NextResponse.json(visits);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch visits" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantUser(request, ["doctor", "nurse"]);
    if (!access.ok) return access.response;

    const data = await request.json();
    const visit = await service.createVisit({ ...data, tenantId: access.user.tenantId });
    return NextResponse.json(visit);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create visit" }, { status: 500 });
  }
}
