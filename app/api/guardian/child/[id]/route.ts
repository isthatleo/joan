import { NextRequest, NextResponse } from "next/server";
import { GuardianService } from "@/lib/services/guardian.service";
import { resolvePermissions, can } from "@/lib/auth/permission-engine";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { guardianPatients, guardians } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const service = new GuardianService();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const relationship = await db
      .select({ id: guardianPatients.id })
      .from(guardianPatients)
      .innerJoin(guardians, eq(guardianPatients.guardianId, guardians.id))
      .where(and(eq(guardians.userId, session.user.id), eq(guardianPatients.patientId, id)))
      .limit(1);
    const isOwner = relationship.length > 0;

    const permissions = await resolvePermissions(session.user.id);
    if (!can(permissions, "patient.read.own_child", { isOwner })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await service.getChildDashboard(id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
