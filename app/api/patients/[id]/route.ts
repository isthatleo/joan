import { NextRequest, NextResponse } from "next/server";
import { PatientService } from "@/lib/services/patient.service";
import { resolvePermissions, can } from "@/lib/auth/permission-engine";
import { auth } from "@/lib/auth/config";

const service = new PatientService();

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const permissions = await resolvePermissions(session.user.id);
    if (!can(permissions, "patient.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const patient = await service.getPatient(params.id);
    return NextResponse.json(patient);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
