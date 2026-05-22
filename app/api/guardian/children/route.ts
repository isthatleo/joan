import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug } from "@/lib/db/helpers";
import { db } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { users, patients, guardianPatients, guardians, visits, appointments, vitals } from "@/lib/db/schema";

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
        patient: patients,
        canViewRecords: guardianPatients.canViewRecords,
        canSchedule: guardianPatients.canSchedule,
        emergencyContact: guardianPatients.emergencyContact
      })
      .from(guardianPatients)
      .innerJoin(patients, eq(guardianPatients.patientId, patients.id))
      .where(eq(guardianPatients.guardianId, guardian[0].id));

    // Get additional data for each child
    const childrenWithDetails = await Promise.all(
      childrenRelations.map(async (relation) => {
        const child = relation.patient;

        // Get last visit
        const lastVisit = await db
          .select()
          .from(visits)
          .where(and(
            eq(visits.tenantId, tenant.id),
            eq(visits.patientId, child.id)
          ))
          .orderBy(desc(visits.createdAt))
          .limit(1);

        // Get next appointment
        const nextAppointment = await db
          .select()
          .from(appointments)
          .where(and(
            eq(appointments.tenantId, tenant.id),
            eq(appointments.patientId, child.id),
            eq(appointments.status, "scheduled")
          ))
          .orderBy(appointments.scheduledAt)
          .limit(1);

        // Get latest vitals for health status
        const latestVitals = await db
          .select()
          .from(vitals)
          .where(eq(vitals.visitId, lastVisit[0]?.id || ""))
          .orderBy(desc(vitals.createdAt))
          .limit(1);

        // Calculate health status (simplified)
        let healthStatus: "excellent" | "good" | "fair" | "poor" = "good";
        if (latestVitals.length > 0) {
          // Simple logic based on vitals
          healthStatus = "excellent"; // Would implement proper logic
        }

        // Calculate age
        const age = child.dob ? Math.floor((Date.now() - new Date(child.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

        return {
          id: child.id,
          firstName: child.firstName || "",
          lastName: child.lastName || "",
          dob: child.dob?.toISOString() || "",
          gender: child.gender || "",
          phone: child.phone || "",
          email: child.email || "",
          address: child.address || "",
          bloodType: "", // Would need to add to schema
          allergies: [], // Would need to add to schema
          conditions: [], // Would need to add to schema
          emergencyContact: {
            name: "Emergency Contact",
            relationship: "Parent/Guardian",
            phone: child.phone || ""
          },
          insurance: null, // Would need to add to schema
          avatar: null,
          lastVisit: lastVisit[0]?.createdAt?.toISOString() || null,
          nextAppointment: nextAppointment[0]?.scheduledAt?.toISOString() || null,
          healthStatus,
          vaccinationStatus: "up-to-date", // Mock data
          permissions: {
            canViewRecords: relation.canViewRecords,
            canSchedule: relation.canSchedule,
            emergencyContact: relation.emergencyContact
          }
        };
      })
    );

    return NextResponse.json(childrenWithDetails);
  } catch (error) {
    console.error("Error fetching guardian children:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
