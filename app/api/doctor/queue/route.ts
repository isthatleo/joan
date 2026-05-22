import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { appointments, patients, users } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Get doctor's user record to verify role
    const doctorUser = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.user.id), eq(users.role, "doctor")))
      .limit(1);

    if (!doctorUser.length) {
      return NextResponse.json({ error: "Doctor access required" }, { status: 403 });
    }

    // Get patient queue (waiting appointments for today)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const queue = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
        patientEmail: patients.email,
        patientPhone: patients.phone,
        checkInTime: appointments.checkInTime,
        estimatedWaitTime: sql<number>`
          CASE
            WHEN ${appointments.checkInTime} IS NOT NULL
            THEN EXTRACT(EPOCH FROM (NOW() - ${appointments.checkInTime})) / 60
            ELSE 0
          END
        `,
        priority: appointments.priority,
        status: appointments.status,
        appointmentType: appointments.type,
        notes: appointments.notes,
        room: appointments.room,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(
        and(
          eq(appointments.doctorId, session.user.id),
          sql`${appointments.scheduledDate} >= ${today}`,
          sql`${appointments.scheduledDate} < ${tomorrow}`,
          sql`${appointments.status} IN ('waiting', 'called', 'in-progress')`
        )
      )
      .orderBy(appointments.checkInTime);

    return NextResponse.json({ queue });

  } catch (error) {
    console.error("Doctor queue API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, room, slug } = body;

    if (!id || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify doctor role
    const doctorUser = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.user.id), eq(users.role, "doctor")))
      .limit(1);

    if (!doctorUser.length) {
      return NextResponse.json({ error: "Doctor access required" }, { status: 403 });
    }

    // Update queue item
    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (room !== undefined) updateData.room = room;

    const updatedAppointment = await db
      .update(appointments)
      .set(updateData)
      .where(and(eq(appointments.id, id), eq(appointments.doctorId, session.user.id)))
      .returning();

    if (!updatedAppointment.length) {
      return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
    }

    return NextResponse.json(updatedAppointment[0]);

  } catch (error) {
    console.error("Update queue API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

