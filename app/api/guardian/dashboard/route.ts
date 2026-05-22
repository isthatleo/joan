import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug } from "@/lib/db/helpers";
import { db } from "@/lib/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { users, patients, appointments, guardianPatients, guardians, visits, prescriptions, labOrders, notifications } from "@/lib/db/schema";

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
      .select({
        patientId: guardianPatients.patientId,
        patient: patients
      })
      .from(guardianPatients)
      .innerJoin(patients, eq(guardianPatients.patientId, patients.id))
      .where(eq(guardianPatients.guardianId, guardian[0].id));

    const children = childrenRelations.map(rel => rel.patient);

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

    const activeChildren = children.filter(child => {
      // Check for recent visits, appointments, etc.
      return true; // Simplified - would check actual activity
    }).length;

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

    // Pending vaccinations (simplified - would check vaccination records)
    const pendingVaccinations = Math.floor(Math.random() * 5) + 1; // Mock data

    // Completed vaccinations
    const completedVaccinations = Math.floor(Math.random() * 10) + 5; // Mock data

    // Unread alerts
    const unreadAlerts = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.tenantId, tenant.id),
        eq(notifications.userId, guardianUserId),
        eq(notifications.read, false)
      ));

    // Health records count
    const healthRecordsCount = await db
      .select()
      .from(visits)
      .where(and(
        eq(visits.tenantId, tenant.id),
        visits.patientId ? children.some(child => child.id === visits.patientId) : false
      ));

    // Average health score (simplified calculation)
    const averageHealthScore = 85; // Mock calculation based on visit data

    // Recent activity count (last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const recentActivityCount = await db
      .select()
      .from(visits)
      .where(and(
        eq(visits.tenantId, tenant.id),
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
