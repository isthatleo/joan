import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug } from "@/lib/db/helpers";
import { db } from "@/lib/db";
import { eq, and, gte } from "drizzle-orm";
import { guardians, guardianPatients, appointments } from "@/lib/db/schema";

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
        patientId: guardianPatients.patientId
      })
      .from(guardianPatients)
      .where(eq(guardianPatients.guardianId, guardian[0].id));

    const childrenIds = childrenRelations.map(rel => rel.patientId);

    // Calculate stats
    const totalChildren = childrenIds.length;

    // Active children (have appointments or recent visits)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeChildren = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenant.id),
        appointments.patientId ? childrenIds.includes(appointments.patientId) : false,
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
        appointments.patientId ? childrenIds.includes(appointments.patientId) : false,
        gte(appointments.scheduledAt, now),
        eq(appointments.status, "scheduled")
      ));

    const uniqueChildrenWithAppointments = new Set(childrenWithAppointments.map(apt => apt.patientId)).size;

    // Children needing vaccinations (mock data - would check vaccination records)
    const childrenNeedingVaccinations = Math.floor(Math.random() * totalChildren) + 1;

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
