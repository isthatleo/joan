import { NextRequest, NextResponse } from "next/server";
import { PatientService } from "@/lib/services/patient.service";
import { resolvePermissions, can } from "@/lib/auth/permission-engine";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const service = new PatientService();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const permissions = await resolvePermissions(session.user.id);
    if (!can(permissions, "patient.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const profile = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
      columns: { tenantId: true, role: true },
    });
    if (!profile?.tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

    const { id } = await params;
    const patient = await service.getPatient(id);
    if (profile.role !== "super_admin" && patient.tenantId !== profile.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(patient);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
