import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug } from "@/lib/db/helpers";
import { db } from "@/lib/db";
import { eq, and, desc, ilike, or } from "drizzle-orm";
import { patients, guardianPatients, visits, appointments, vitals, patientAllergies, patientConditions, notifications } from "@/lib/db/schema";
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
        patient: patients,
        canViewRecords: guardianPatients.canViewRecords,
        canSchedule: guardianPatients.canSchedule,
        emergencyContact: guardianPatients.emergencyContact
      })
      .from(guardianPatients)
      .innerJoin(patients, eq(guardianPatients.patientId, patients.id))
      .where(eq(guardianPatients.guardianId, access.guardian.id));

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
        const latestVitals = lastVisit[0]?.id
          ? await db
              .select()
              .from(vitals)
              .where(eq(vitals.visitId, lastVisit[0].id))
              .orderBy(desc(vitals.createdAt))
              .limit(1)
          : [];

        const allergies = await db
          .select({ allergy: patientAllergies.allergy })
          .from(patientAllergies)
          .where(eq(patientAllergies.patientId, child.id));

        const conditions = await db
          .select({ condition: patientConditions.condition })
          .from(patientConditions)
          .where(eq(patientConditions.patientId, child.id));

        const vaccinationSignals = await db
          .select({ read: notifications.read })
          .from(notifications)
          .where(and(
            eq(notifications.tenantId, tenant.id),
            eq(notifications.userId, access.user.id),
            or(
              ilike(notifications.type, `%${child.id}%`),
              ilike(notifications.title, "%vaccin%"),
              ilike(notifications.message, "%vaccin%"),
              ilike(notifications.title, "%immun%"),
              ilike(notifications.message, "%immun%")
            )
          ))
          .limit(20);

        let healthStatus: "excellent" | "good" | "fair" | "poor" = "good";
        if (latestVitals.length > 0) {
          const oxygen = Number(latestVitals[0].oxygenSaturation || 0);
          const pain = Number(latestVitals[0].painScore || 0);
          if ((oxygen > 0 && oxygen < 92) || pain >= 8) healthStatus = "poor";
          else if ((oxygen > 0 && oxygen < 95) || pain >= 5) healthStatus = "fair";
          else if ((oxygen >= 97 || oxygen === 0) && pain <= 2) healthStatus = "excellent";
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
          bloodType: "",
          allergies: allergies.map((item) => item.allergy).filter(Boolean),
          conditions: conditions.map((item) => item.condition).filter(Boolean),
          emergencyContact: {
            name: access.user.fullName || "Guardian",
            relationship: access.guardian.relationship || "guardian",
            phone: access.user.phone || child.phone || ""
          },
          insurance: null,
          avatar: null,
          lastVisit: lastVisit[0]?.createdAt?.toISOString() || null,
          nextAppointment: nextAppointment[0]?.scheduledAt?.toISOString() || null,
          healthStatus,
          vaccinationStatus: vaccinationSignals.some((signal) => !signal.read) ? "attention-needed" : "not-recorded",
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
