import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug } from "@/lib/db/helpers";
import { db } from "@/lib/db";
import { eq, and, gte, lte, inArray, or, ilike } from "drizzle-orm";
import { patients, appointments, guardianPatients, visits, notifications } from "@/lib/db/schema";
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
    if (access.status !== 200 || !access.guardian || !access.user) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Get children associated with this guardian
    const childrenRelations = await db
      .select({
        patientId: guardianPatients.patientId,
        patient: patients
      })
      .from(guardianPatients)
      .innerJoin(patients, eq(guardianPatients.patientId, patients.id))
      .where(eq(guardianPatients.guardianId, access.guardian.id));

    const children = childrenRelations.map(rel => rel.patient);
    const childrenIds = children.map((child) => child.id);
    if (childrenIds.length === 0) {
      return NextResponse.json({
        totalChildren: 0,
        activeChildren: 0,
        upcomingAppointments: 0,
        completedAppointments: 0,
        pendingVaccinations: 0,
        completedVaccinations: 0,
        unreadAlerts: 0,
        healthRecordsCount: 0,
        averageHealthScore: 0,
        recentActivityCount: 0,
      });
    }

    // Calculate metrics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    // Total children
    const totalChildren = children.length;

    // Active children (have recent activity)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeAppointments = await db
      .select({ patientId: appointments.patientId })
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenant.id),
        inArray(appointments.patientId, childrenIds),
        gte(appointments.scheduledAt, thirtyDaysAgo)
      ));

    const activeVisits = await db
      .select({ patientId: visits.patientId })
      .from(visits)
      .where(and(
        eq(visits.tenantId, tenant.id),
        inArray(visits.patientId, childrenIds),
        gte(visits.createdAt, thirtyDaysAgo)
      ));

    const activeChildren = new Set([...activeAppointments, ...activeVisits].map((item) => item.patientId)).size;

    // Upcoming appointments
    const upcomingAppointments = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenant.id),
        gte(appointments.scheduledAt, now),
        lte(appointments.scheduledAt, nextWeek)
      ));

    const upcomingAppointmentsCount = upcomingAppointments.filter(apt =>
      children.some(child => child.id === apt.patientId)
    ).length;

    // Completed appointments this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedAppointmentsThisMonth = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenant.id),
        eq(appointments.status, "completed"),
        gte(appointments.scheduledAt, startOfMonth)
      ));

    const completedAppointmentsCount = completedAppointmentsThisMonth.filter(apt =>
      children.some(child => child.id === apt.patientId)
    ).length;

    const vaccinationAppointments = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenant.id),
        inArray(appointments.patientId, childrenIds),
        or(
          ilike(appointments.status, "%vaccin%"),
          ilike(appointments.status, "%immun%")
        )
      ));

    const vaccinationAlerts = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.tenantId, tenant.id),
        eq(notifications.userId, access.user.id),
        or(
          ilike(notifications.type, "%vaccin%"),
          ilike(notifications.title, "%vaccin%"),
          ilike(notifications.message, "%vaccin%"),
          ilike(notifications.type, "%immun%"),
          ilike(notifications.title, "%immun%"),
          ilike(notifications.message, "%immun%")
        )
      ));

    const pendingVaccinations = vaccinationAlerts.filter((alert) => !alert.read).length;
    const completedVaccinations = vaccinationAppointments.filter((apt) => apt.status === "completed").length;

    // Unread alerts
    const unreadAlerts = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.tenantId, tenant.id),
        eq(notifications.userId, access.user.id),
        eq(notifications.read, false)
      ));

    // Health records count
    const healthRecordsCount = await db
      .select()
      .from(visits)
      .where(and(
        eq(visits.tenantId, tenant.id),
        inArray(visits.patientId, childrenIds)
      ));

    const averageHealthScore = totalChildren === 0
      ? 0
      : Math.max(55, Math.min(100, 95 - unreadAlerts.length * 2 - pendingVaccinations * 3 + Math.min(10, healthRecordsCount.length)));

    // Recent activity count (last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const recentActivityCount = await db
      .select()
      .from(visits)
      .where(and(
        eq(visits.tenantId, tenant.id),
        inArray(visits.patientId, childrenIds),
        gte(visits.createdAt, lastWeek)
      ));

    const metrics = {
      totalChildren,
      activeChildren,
      upcomingAppointments: upcomingAppointmentsCount,
      completedAppointments: completedAppointmentsCount,
      pendingVaccinations,
      completedVaccinations,
      unreadAlerts: unreadAlerts.length,
      healthRecordsCount: healthRecordsCount.length,
      averageHealthScore,
      recentActivityCount: recentActivityCount.length
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching guardian dashboard metrics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
