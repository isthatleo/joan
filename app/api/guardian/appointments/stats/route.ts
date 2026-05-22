import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug } from "@/lib/db/helpers";
import { db } from "@/lib/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { appointments, guardians, guardianPatients } from "@/lib/db/schema";

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

    // Get guardian's user ID from session/token (simplified for demo)
    const guardianUserId = "guardian-user-id"; // This would come from auth

    // Get guardian record
    const guardian = await db
      .select()
      .from(guardians)
      .where(and(eq(guardians.tenantId, tenant.id), eq(guardians.userId, guardianUserId)))
      .limit(1);

    if (!guardian.length) {
      return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
    }

    // Get children associated with this guardian
    const childrenRelations = await db
      .select({ patientId: guardianPatients.patientId })
      .from(guardianPatients)
      .where(eq(guardianPatients.guardianId, guardian[0].id));

    const childrenIds = childrenRelations.map(rel => rel.patientId);

    // Get appointment statistics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total appointments
    const totalAppointments = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenant.id),
        appointments.patientId ? childrenIds.includes(appointments.patientId) : false
      ));

    // Upcoming appointments
    const upcomingAppointments = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenant.id),
        appointments.patientId ? childrenIds.includes(appointments.patientId) : false,
        gte(appointments.scheduledAt, now),
        eq(appointments.status, "scheduled")
      ));

    // Completed appointments
    const completedAppointments = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenant.id),
        appointments.patientId ? childrenIds.includes(appointments.patientId) : false,
        eq(appointments.status, "completed")
      ));

    // Completed appointments this month
    const completedAppointmentsThisMonth = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenant.id),
        appointments.patientId ? childrenIds.includes(appointments.patientId) : false,
        eq(appointments.status, "completed"),
        gte(appointments.scheduledAt, startOfMonth)
      ));

    // Cancelled appointments
    const cancelledAppointments = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenant.id),
        appointments.patientId ? childrenIds.includes(appointments.patientId) : false,
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
