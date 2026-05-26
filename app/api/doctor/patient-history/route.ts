import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { appointments, labOrders, patients, prescriptions, visits } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveDoctorContext } from "@/lib/doctor/server";
import { getEligiblePatientIdsForTenant } from "@/lib/patient-access";

export async function GET(request: NextRequest) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  if (!doctor.tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  try {
    const search = request.nextUrl.searchParams.get("search")?.trim() || "";
    const status = request.nextUrl.searchParams.get("status")?.trim() || "all";
    const risk = request.nextUrl.searchParams.get("risk")?.trim() || "all";

    const eligiblePatientIds = await getEligiblePatientIdsForTenant(doctor.tenantId);
    if (!eligiblePatientIds.length) {
      return NextResponse.json({ patients: [], stats: { totalPatients: 0, withVisits: 0, activePrescriptions: 0, pendingLabOrders: 0, needsAttention: 0 } });
    }

    const conditions = [eq(patients.tenantId, doctor.tenantId), isNull(patients.deletedAt), inArray(patients.id, eligiblePatientIds)];
    if (status !== "all") {
      conditions.push(eq(patients.status, status));
    }
    if (search) {
      conditions.push(
        or(
          ilike(patients.firstName, `%${search}%`),
          ilike(patients.lastName, `%${search}%`),
          ilike(patients.email, `%${search}%`),
          ilike(patients.phone, `%${search}%`),
          ilike(patients.globalPatientId, `%${search}%`)
        )!
      );
    }

    const rows = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        fullName: sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))` ,
        email: patients.email,
        phone: patients.phone,
        status: patients.status,
        globalPatientId: patients.globalPatientId,
        createdAt: patients.createdAt,
        totalVisits: sql<number>`(
          select count(*)::int
          from ${visits}
          where ${visits.patientId} = ${patients.id}
            and ${visits.tenantId} = ${doctor.tenantId}
            and ${visits.doctorId} = ${doctor.id}
            and ${visits.deletedAt} is null
        )`,
        totalAppointments: sql<number>`(
          select count(*)::int
          from ${appointments}
          where ${appointments.patientId} = ${patients.id}
            and ${appointments.tenantId} = ${doctor.tenantId}
            and ${appointments.doctorId} = ${doctor.id}
            and ${appointments.deletedAt} is null
        )`,
        activePrescriptions: sql<number>`(
          select count(*)::int
          from ${prescriptions}
          where ${prescriptions.patientId} = ${patients.id}
            and ${prescriptions.tenantId} = ${doctor.tenantId}
            and ${prescriptions.doctorId} = ${doctor.id}
            and ${prescriptions.deletedAt} is null
            and ${prescriptions.status} = 'active'
        )`,
        pendingLabOrders: sql<number>`(
          select count(*)::int
          from ${labOrders}
          where ${labOrders.patientId} = ${patients.id}
            and ${labOrders.tenantId} = ${doctor.tenantId}
            and ${labOrders.doctorId} = ${doctor.id}
            and ${labOrders.deletedAt} is null
            and ${labOrders.status} <> 'completed'
        )`,
        latestInteractionAt: sql<string | null>`(
          select max(entry_date)::text from (
            select ${visits.createdAt} as entry_date
            from ${visits}
            where ${visits.patientId} = ${patients.id}
              and ${visits.tenantId} = ${doctor.tenantId}
              and ${visits.doctorId} = ${doctor.id}
              and ${visits.deletedAt} is null
            union all
            select ${appointments.scheduledAt} as entry_date
            from ${appointments}
            where ${appointments.patientId} = ${patients.id}
              and ${appointments.tenantId} = ${doctor.tenantId}
              and ${appointments.doctorId} = ${doctor.id}
              and ${appointments.deletedAt} is null
            union all
            select ${prescriptions.prescribedAt} as entry_date
            from ${prescriptions}
            where ${prescriptions.patientId} = ${patients.id}
              and ${prescriptions.tenantId} = ${doctor.tenantId}
              and ${prescriptions.doctorId} = ${doctor.id}
              and ${prescriptions.deletedAt} is null
          ) timeline
        )`,
      })
      .from(patients)
      .where(and(...conditions));

    const filteredRows = rows.filter((row) => {
      const needsAttention = row.pendingLabOrders > 0 || row.activePrescriptions > 2 || row.totalVisits === 0;
      return risk === "attention" ? needsAttention : true;
    });

    const stats = {
      totalPatients: filteredRows.length,
      withVisits: filteredRows.filter((row) => row.totalVisits > 0).length,
      activePrescriptions: filteredRows.reduce((sum, row) => sum + row.activePrescriptions, 0),
      pendingLabOrders: filteredRows.reduce((sum, row) => sum + row.pendingLabOrders, 0),
      needsAttention: filteredRows.filter((row) => row.pendingLabOrders > 0 || row.activePrescriptions > 2 || row.totalVisits === 0).length,
    };

    return NextResponse.json({ patients: filteredRows, stats });
  } catch (error) {
    console.error("Doctor patient history roster API error:", error);
    return NextResponse.json({ error: "Failed to load patient history roster" }, { status: 500 });
  }
}


