import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug } from "@/lib/db/helpers";
import { db } from "@/lib/db";
import { eq, and, gte, inArray } from "drizzle-orm";
import { appointments, guardianPatients } from "@/lib/db/schema";
import { resolveGuardianForTenant } from "@/lib/api/guardian-auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    }

    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const access = await resolveGuardianForTenant(request, tenant.id);
    if (access.status !== 200 || !access.guardian) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Get children associated with this guardian
    const childrenRelations = await db
      .select({ patientId: guardianPatients.patientId })
      .from(guardianPatients)
      .where(eq(guardianPatients.guardianId, access.guardian.id));

    const childrenIds = childrenRelations.map(rel => rel.patientId).filter((id): id is string => Boolean(id));
    if (childrenIds.length === 0) {
      return NextResponse.json({
        total: 0,
        upcoming: 0,
        completed: 0,
        completedThisMonth: 0,
        cancelled: 0,
      });
    }

    // Get appointment statistics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total appointments
    const totalAppointments = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenant.id),
        inArray(appointments.patientId, childrenIds)
      ));

    // Upcoming appointments
    const upcomingAppointments = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenant.id),
        inArray(appointments.patientId, childrenIds),
        gte(appointments.scheduledAt, now),
        eq(appointments.status, "scheduled")
      ));

    // Completed appointments
    const completedAppointments = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenant.id),
        inArray(appointments.patientId, childrenIds),
        eq(appointments.status, "completed")
      ));

    // Completed appointments this month
    const completedAppointmentsThisMonth = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenant.id),
        inArray(appointments.patientId, childrenIds),
        eq(appointments.status, "completed"),
        gte(appointments.scheduledAt, startOfMonth)
      ));

    // Cancelled appointments
    const cancelledAppointments = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenant.id),
        inArray(appointments.patientId, childrenIds),
        eq(appointments.status, "cancelled")
      ));

    const stats = {
      total: totalAppointments.length,
      upcoming: upcomingAppointments.length,
      completed: completedAppointments.length,
      completedThisMonth: completedAppointmentsThisMonth.length,
      cancelled: cancelledAppointments.length
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching guardian appointment stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
