import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and, desc, sql, count, avg } from "drizzle-orm";
import { appointments, labOrders, prescriptions, labResults, patients, users } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const patientId = searchParams.get("patientId") || searchParams.get("id");

    if (!slug || !patientId) {
      return NextResponse.json({ error: "Tenant slug and patient ID required" }, { status: 400 });
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

    // Get patient analytics
    const [
      totalVisits,
      averageVisitDuration,
      prescriptionCount,
      labOrderCount,
      lastVisit,
      nextAppointment,
    ] = await Promise.all([
      // Total visits
      db
        .select({ count: count() })
        .from(appointments)
        .where(
          and(
            eq(appointments.patientId, patientId),
            eq(appointments.doctorId, session.user.id),
            sql`${appointments.status} IN ('completed', 'in-progress')`
          )
        )
        .then(result => result[0].count),

      // Average visit duration
      db
        .select({ avg: avg(appointments.duration) })
        .from(appointments)
        .where(
          and(
            eq(appointments.patientId, patientId),
            eq(appointments.doctorId, session.user.id),
            eq(appointments.status, "completed")
          )
        )
        .then(result => Math.round(result[0].avg || 0)),

      // Prescription count
      db
        .select({ count: count() })
        .from(prescriptions)
        .where(
          and(
            eq(prescriptions.patientId, patientId),
            eq(prescriptions.doctorId, session.user.id)
          )
        )
        .then(result => result[0].count),

      // Lab order count
      db
        .select({ count: count() })
        .from(labOrders)
        .where(
          and(
            eq(labOrders.patientId, patientId),
            eq(labOrders.doctorId, session.user.id)
          )
        )
        .then(result => result[0].count),

      // Last visit
      db
        .select({ scheduledDate: appointments.scheduledDate })
        .from(appointments)
        .where(
          and(
            eq(appointments.patientId, patientId),
            eq(appointments.doctorId, session.user.id),
            sql`${appointments.status} IN ('completed', 'in-progress')`
          )
        )
        .orderBy(desc(appointments.scheduledDate))
        .limit(1)
        .then(result => result[0]?.scheduledDate),

      // Next appointment
      db
        .select({ scheduledDate: appointments.scheduledDate })
        .from(appointments)
        .where(
          and(
            eq(appointments.patientId, patientId),
            eq(appointments.doctorId, session.user.id),
            eq(appointments.status, "scheduled"),
            sql`${appointments.scheduledDate} >= NOW()`
          )
        )
        .orderBy(appointments.scheduledDate)
        .limit(1)
        .then(result => result[0]?.scheduledDate),
    ]);

    // Calculate health score (simplified algorithm)
    let healthScore = 85; // Base score

    // Adjust based on visit frequency (more visits = potentially more complex case)
    if (totalVisits > 10) healthScore -= 5;
    else if (totalVisits > 5) healthScore -= 2;

    // Adjust based on prescriptions (more prescriptions = potentially more complex)
    if (prescriptionCount > 5) healthScore -= 5;
    else if (prescriptionCount > 2) healthScore -= 2;

    // Adjust based on lab orders (more tests = potentially more monitoring needed)
    if (labOrderCount > 10) healthScore -= 5;
    else if (labOrderCount > 5) healthScore -= 2;

    // Ensure score stays within bounds
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Get risk factors (simplified - in real app this would be more sophisticated)
    const riskFactors: string[] = [];

    if (prescriptionCount > 5) {
      riskFactors.push("Multiple active prescriptions - monitor for interactions");
    }

    if (labOrderCount > 10) {
      riskFactors.push("Frequent lab testing - may indicate chronic condition monitoring");
    }

    if (totalVisits < 2) {
      riskFactors.push("Limited visit history - consider comprehensive assessment");
    }

    // Get trends data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [visitsTrend, prescriptionsTrend, labOrdersTrend] = await Promise.all([
      // Visits over time
      db
        .select({
          date: sql<string>`DATE_TRUNC('month', ${appointments.scheduledDate})`,
          count: count(),
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.patientId, patientId),
            eq(appointments.doctorId, session.user.id),
            sql`${appointments.scheduledDate} >= ${sixMonthsAgo}`,
            sql`${appointments.status} IN ('completed', 'in-progress')`
          )
        )
        .groupBy(sql`DATE_TRUNC('month', ${appointments.scheduledDate})`)
        .orderBy(sql`DATE_TRUNC('month', ${appointments.scheduledDate})`),

      // Prescriptions over time
      db
        .select({
          date: sql<string>`DATE_TRUNC('month', ${prescriptions.prescribedAt})`,
          count: count(),
        })
        .from(prescriptions)
        .where(
          and(
            eq(prescriptions.patientId, patientId),
            eq(prescriptions.doctorId, session.user.id),
            sql`${prescriptions.prescribedAt} >= ${sixMonthsAgo}`
          )
        )
        .groupBy(sql`DATE_TRUNC('month', ${prescriptions.prescribedAt})`)
        .orderBy(sql`DATE_TRUNC('month', ${prescriptions.prescribedAt})`),

      // Lab orders over time
      db
        .select({
          date: sql<string>`DATE_TRUNC('month', ${labOrders.orderedAt})`,
          count: count(),
        })
        .from(labOrders)
        .where(
          and(
            eq(labOrders.patientId, patientId),
            eq(labOrders.doctorId, session.user.id),
            sql`${labOrders.orderedAt} >= ${sixMonthsAgo}`
          )
        )
        .groupBy(sql`DATE_TRUNC('month', ${labOrders.orderedAt})`)
        .orderBy(sql`DATE_TRUNC('month', ${labOrders.orderedAt})`),
    ]);

    const analytics = {
      totalVisits,
      averageVisitDuration,
      prescriptionCount,
      labOrderCount,
      lastVisitDate: lastVisit?.toISOString(),
      nextAppointmentDate: nextAppointment?.toISOString(),
      healthScore,
      riskFactors,
      trends: {
        visitsOverTime: visitsTrend.map(item => ({
          date: item.date,
          count: item.count,
        })),
        prescriptionsOverTime: prescriptionsTrend.map(item => ({
          date: item.date,
          count: item.count,
        })),
        labOrdersOverTime: labOrdersTrend.map(item => ({
          date: item.date,
          count: item.count,
        })),
      },
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error("Doctor patient analytics API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

