import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug } from "@/lib/db/helpers";
import { db } from "@/lib/db";
import { eq, and, gte, desc, inArray } from "drizzle-orm";
import { appointments, users, patients, guardianPatients, visits } from "@/lib/db/schema";
import { resolveGuardianForTenant } from "@/lib/api/guardian-auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const upcoming = searchParams.get("upcoming") === "true";

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
      return NextResponse.json([]);
    }

    // Build query conditions
    let whereConditions = and(
      eq(appointments.tenantId, tenant.id),
      inArray(appointments.patientId, childrenIds)
    );

    if (upcoming) {
      whereConditions = and(whereConditions, gte(appointments.scheduledAt, new Date()));
    }

    // Get appointments
    const appointmentsData = await db
      .select({
        appointment: appointments,
        patient: patients,
        doctor: users
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .innerJoin(users, eq(appointments.doctorId, users.id))
      .where(whereConditions)
      .orderBy(upcoming ? appointments.scheduledAt : desc(appointments.createdAt));

    // Format the response
    const formattedAppointments = await Promise.all(
      appointmentsData.map(async (item) => {
        const visit = await db.query.visits.findFirst({
          where: eq(visits.appointmentId, item.appointment.id),
          columns: { reason: true, notes: true },
        });

        return {
          id: item.appointment.id,
          childId: item.patient.id,
          childName: `${item.patient.firstName || ""} ${item.patient.lastName || ""}`.trim() || item.patient.fullName || "Patient",
          doctorId: item.doctor.id,
          doctorName: item.doctor.fullName || item.doctor.email,
          specialty: item.doctor.role || "clinician",
          date: item.appointment.scheduledAt?.toISOString().split("T")[0] || "",
          time: item.appointment.scheduledAt?.toTimeString().slice(0, 5) || "",
          duration: 30,
          type: visit?.reason || "Clinical appointment",
          status: item.appointment.status as "scheduled" | "confirmed" | "completed" | "cancelled" | "no-show",
          location: tenant.name,
          notes: visit?.notes || "",
          reason: visit?.reason || "",
          createdAt: item.appointment.createdAt?.toISOString() || "",
          updatedAt: item.appointment.updatedAt?.toISOString() || "",
          canReschedule: item.appointment.status === "scheduled",
          canCancel: item.appointment.status === "scheduled",
        };
      })
    );

    return NextResponse.json(formattedAppointments);
  } catch (error) {
    console.error("Error fetching guardian appointments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { childId, doctorId, appointmentTypeId, date, timeSlot, reason, notes } = body;

    // Validate required fields
    if (!childId || !doctorId || !date || !timeSlot || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const access = await resolveGuardianForTenant(request, tenant.id);
    if (access.status !== 200 || !access.guardian) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const childRelation = await db
      .select()
      .from(guardianPatients)
      .where(and(
        eq(guardianPatients.guardianId, access.guardian.id),
        eq(guardianPatients.patientId, childId)
      ))
      .limit(1);

    if (!childRelation.length || !childRelation[0].canSchedule) {
      return NextResponse.json({ error: "Not authorized to schedule for this child" }, { status: 403 });
    }

    // Create appointment
    const scheduledDateTime = new Date(`${date}T${timeSlot}`);

    const newAppointment = await db
      .insert(appointments)
      .values({
        tenantId: tenant.id,
        patientId: childId,
        doctorId: doctorId,
        scheduledAt: scheduledDateTime,
        status: "scheduled",
      })
      .returning();

    return NextResponse.json({
      success: true,
      appointment: newAppointment[0]
    });
  } catch (error) {
    console.error("Error creating guardian appointment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
