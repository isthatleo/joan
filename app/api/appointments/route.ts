import { NextRequest, NextResponse } from "next/server";
import { AppointmentService } from "@/lib/services/appointment.service";
import { resolvePermissions, can } from "@/lib/auth/permission-engine";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const service = new AppointmentService();

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const permissions = await resolvePermissions(session.user.id);
    if (!can(permissions, "appointment.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const profile = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
      columns: { tenantId: true },
    });
    const tenantId = profile?.tenantId;
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

    const appointments = await service.getAppointmentsByTenant(tenantId);
    return NextResponse.json(appointments);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const permissions = await resolvePermissions(session.user.id);
    if (!can(permissions, "appointment.write")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const data = await request.json();
    const appointment = await service.createAppointment(data);
    return NextResponse.json(appointment);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
