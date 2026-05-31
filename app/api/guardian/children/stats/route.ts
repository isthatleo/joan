import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug } from "@/lib/db/helpers";
import { db } from "@/lib/db";
import { eq, and, gte, inArray, ilike, or } from "drizzle-orm";
import { guardianPatients, appointments, notifications } from "@/lib/db/schema";
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
        patientId: guardianPatients.patientId
      })
      .from(guardianPatients)
      .where(eq(guardianPatients.guardianId, access.guardian.id));

    const childrenIds = childrenRelations.map(rel => rel.patientId).filter((id): id is string => Boolean(id));

    // Calculate stats
    const totalChildren = childrenIds.length;
    if (totalChildren === 0) {
      return NextResponse.json({
        totalChildren: 0,
        activeChildren: 0,
        childrenWithAppointments: 0,
        childrenNeedingVaccinations: 0,
      });
    }

    // Active children (have appointments or recent visits)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeChildren = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenant.id),
        inArray(appointments.patientId, childrenIds),
        gte(appointments.scheduledAt, thirtyDaysAgo)
      ));

    const uniqueActiveChildren = new Set(activeChildren.map(apt => apt.patientId)).size;

    // Children with upcoming appointments
    const now = new Date();
    const childrenWithAppointments = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenant.id),
        inArray(appointments.patientId, childrenIds),
        gte(appointments.scheduledAt, now),
        eq(appointments.status, "scheduled")
      ));

    const uniqueChildrenWithAppointments = new Set(childrenWithAppointments.map(apt => apt.patientId)).size;

    const vaccinationAlerts = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.tenantId, tenant.id),
        eq(notifications.userId, access.user.id),
        eq(notifications.read, false),
        or(
          ilike(notifications.type, "%vaccin%"),
          ilike(notifications.title, "%vaccin%"),
          ilike(notifications.message, "%vaccin%"),
          ilike(notifications.type, "%immun%"),
          ilike(notifications.title, "%immun%"),
          ilike(notifications.message, "%immun%")
        )
      ));

    const childrenNeedingVaccinations = Math.min(totalChildren, vaccinationAlerts.length);

    const stats = {
      totalChildren,
      activeChildren: uniqueActiveChildren,
      childrenWithAppointments: uniqueChildrenWithAppointments,
      childrenNeedingVaccinations
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching guardian children stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
