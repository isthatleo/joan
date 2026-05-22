import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { users, appointments, prescriptions, labOrders } from "@/lib/db/schema";

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

    // Get recent activities (last 10 items from different tables)
    const [recentAppointments, recentPrescriptions, recentLabOrders] = await Promise.all([
      // Recent appointments
      db
        .select({
          id: sql<string>`concat('apt_', ${appointments.id})`,
          type: sql<string>`'appointment'`,
          title: sql<string>`'Completed appointment'`,
          description: sql<string>`concat('Appointment completed with patient')`,
          timestamp: appointments.updatedAt,
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, session.user.id),
            eq(appointments.status, "completed")
          )
        )
        .orderBy(desc(appointments.updatedAt))
        .limit(3),

      // Recent prescriptions
      db
        .select({
          id: sql<string>`concat('rx_', ${prescriptions.id})`,
          type: sql<string>`'prescription'`,
          title: sql<string>`concat('Prescribed ', ${prescriptions.medication})`,
          description: sql<string>`'New prescription issued'`,
          timestamp: prescriptions.prescribedAt,
        })
        .from(prescriptions)
        .where(eq(prescriptions.doctorId, session.user.id))
        .orderBy(desc(prescriptions.prescribedAt))
        .limit(3),

      // Recent lab orders
      db
        .select({
          id: sql<string>`concat('lab_', ${labOrders.id})`,
          type: sql<string>`'lab'`,
          title: sql<string>`concat('Ordered ', ${labOrders.testName})`,
          description: sql<string>`'Lab test ordered'`,
          timestamp: labOrders.orderedAt,
        })
        .from(labOrders)
        .where(eq(labOrders.doctorId, session.user.id))
        .orderBy(desc(labOrders.orderedAt))
        .limit(4),
    ]);

    // Combine and sort all activities
    const allActivities = [
      ...recentAppointments.map(item => ({ ...item, timestamp: item.timestamp.toISOString() })),
      ...recentPrescriptions.map(item => ({ ...item, timestamp: item.timestamp.toISOString() })),
      ...recentLabOrders.map(item => ({ ...item, timestamp: item.timestamp.toISOString() })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Take the most recent 10
    const activities = allActivities.slice(0, 10);

    return NextResponse.json(activities);

  } catch (error) {
    console.error("Doctor activities API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

