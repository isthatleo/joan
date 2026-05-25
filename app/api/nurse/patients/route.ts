import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import { bedAssignments, patientAllergies, patientConditions, patients, users, visits } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveNurseContext } from "@/lib/nurse/server";
import { patientNameSql } from "@/lib/nurse/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const status = request.nextUrl.searchParams.get("status");
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const limit = Number(request.nextUrl.searchParams.get("limit") || "0");

  const context = await resolveNurseContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { nurse } = context;

  try {
    const conditions = [eq(patients.tenantId, nurse.tenantId), isNull(patients.deletedAt)];
    if (status && status !== "all") conditions.push(eq(patients.status, status));
    if (search) {
      conditions.push(
        sql`(${patients.firstName} ilike ${`%${search}%`} or ${patients.lastName} ilike ${`%${search}%`} or ${patients.mrn} ilike ${`%${search}%`} or ${bedAssignments.room} ilike ${`%${search}%`})`
      );
    }

    let query = db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        fullName: patientNameSql,
        dob: patients.dob,
        gender: patients.gender,
        phone: patients.phone,
        email: patients.email,
        mrn: patients.mrn,
        currentStatus: patients.status,
        room: bedAssignments.room,
        bed: bedAssignments.bedNumber,
        ward: bedAssignments.ward,
        admissionDate: bedAssignments.admissionDate,
        primaryCondition: bedAssignments.condition,
      })
      .from(patients)
      .leftJoin(bedAssignments, and(eq(bedAssignments.patientId, patients.id), eq(bedAssignments.tenantId, nurse.tenantId), isNull(bedAssignments.deletedAt)))
      .where(and(...conditions))
      .orderBy(desc(patients.updatedAt));

    const rows = limit > 0 ? await query.limit(limit) : await query;
    const patientIds = rows.map((row) => row.id);

    const [allergies, conditionsRows, latestVisits] = patientIds.length
      ? await Promise.all([
          db.select({ patientId: patientAllergies.patientId, allergy: patientAllergies.allergy }).from(patientAllergies).where(inArray(patientAllergies.patientId, patientIds)),
          db.select({ patientId: patientConditions.patientId, condition: patientConditions.condition }).from(patientConditions).where(inArray(patientConditions.patientId, patientIds)),
          db
            .select({
              patientId: visits.patientId,
              notes: visits.notes,
              reason: visits.reason,
              doctorName: users.fullName,
            })
            .from(visits)
            .leftJoin(users, eq(users.id, visits.doctorId))
            .where(and(eq(visits.tenantId, nurse.tenantId), inArray(visits.patientId, patientIds), isNull(visits.deletedAt)))
            .orderBy(desc(visits.createdAt)),
        ])
      : [[], [], []];

    const allergyMap = new Map<string, string[]>();
    for (const row of allergies) {
      allergyMap.set(row.patientId!, [...(allergyMap.get(row.patientId!) || []), row.allergy || ""]);
    }

    const conditionMap = new Map<string, string[]>();
    for (const row of conditionsRows) {
      conditionMap.set(row.patientId!, [...(conditionMap.get(row.patientId!) || []), row.condition || ""]);
    }

    const visitMap = new Map<string, { notes: string | null; reason: string | null; doctorName: string | null }>();
    for (const row of latestVisits) {
      if (!visitMap.has(row.patientId!)) {
        visitMap.set(row.patientId!, row);
      }
    }

    const data = rows.map((row) => {
      const age = row.dob ? Math.max(0, new Date().getFullYear() - new Date(row.dob).getFullYear()) : null;
      const latestVisit = visitMap.get(row.id);
      return {
        ...row,
        age,
        allergies: allergyMap.get(row.id) || [],
        secondaryConditions: conditionMap.get(row.id) || [],
        doctorName: latestVisit?.doctorName || "Unassigned",
        notes: latestVisit?.notes || null,
        medicalHistory: latestVisit?.reason || null,
      };
    });

    const stats = {
      total: data.length,
      critical: data.filter((row) => row.currentStatus === "critical").length,
      occupiedBeds: data.filter((row) => row.bed).length,
      pendingReview: data.filter((row) => row.currentStatus === "declining" || row.currentStatus === "improving").length,
    };

    return NextResponse.json({ patients: data, stats });
  } catch (error) {
    console.error("Nurse patients API error:", error);
    return NextResponse.json({ error: "Failed to load nurse patients" }, { status: 500 });
  }
}
