import { NextRequest, NextResponse } from "next/server";
import { PharmacyService } from "@/lib/services/pharmacy.service";
import { resolvePermissions, can } from "@/lib/auth/permission-engine";
import { auth } from "@/lib/auth/config";

const service = new PharmacyService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const permissions = await resolvePermissions(session.user.id);
    if (!can(permissions, "pharmacy.prescription.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const prescription = await service.getPrescriptionById(resolvedParams.id);
    return NextResponse.json(prescription);
  } catch (error) {
    console.error('Error fetching prescription:', error);
    return NextResponse.json({ error: "Failed to fetch prescription" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const permissions = await resolvePermissions(session.user.id);
    if (!can(permissions, "pharmacy.prescription.write")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const data = await request.json();
    const { status, dispensedBy } = data;

    const result = await service.updatePrescriptionStatus(resolvedParams.id, status, dispensedBy);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating prescription:', error);
    return NextResponse.json({ error: "Failed to update prescription" }, { status: 500 });
  }
}
