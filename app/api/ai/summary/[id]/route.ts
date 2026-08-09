import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/services/ai.service";
import { PatientService } from "@/lib/services/patient.service";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";

const service = new AIService();
const patientService = new PatientService();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const appUser = await db.query.users.findFirst({
      where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
      columns: { tenantId: true, role: true },
    });
    if (!appUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const patient = await patientService.getPatient(id).catch(() => null);
    if (!patient) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (appUser.role !== "super_admin" && patient.tenantId !== appUser.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await service.summary(id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
