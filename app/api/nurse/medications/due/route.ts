import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull, lte } from "drizzle-orm";
import { bedAssignments, medicationAdministrations, patients, prescriptionItems } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveNurseContext } from "@/lib/nurse/server";
import { patientNameSql } from "@/lib/nurse/utils";

export const dynamic = "force-dynamic";

function addHours(date: Date, hours: number) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveNurseContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const rows = await db
    .select({
      id: medicationAdministrations.id,
      patientName: patientNameSql,
      medication: prescriptionItems.drugName,
      dosage: prescriptionItems.dosage,
      scheduledAt: medicationAdministrations.scheduledAt,
      room: bedAssignments.room,
    })
    .from(medicationAdministrations)
    .innerJoin(patients, eq(patients.id, medicationAdministrations.patientId))
    .leftJoin(prescriptionItems, eq(prescriptionItems.id, medicationAdministrations.prescriptionItemId))
    .leftJoin(bedAssignments, and(eq(bedAssignments.patientId, patients.id), eq(bedAssignments.tenantId, context.nurse.tenantId), isNull(bedAssignments.deletedAt)))
    .where(and(eq(medicationAdministrations.tenantId, context.nurse.tenantId), isNull(medicationAdministrations.deletedAt), eq(medicationAdministrations.status, "pending"), lte(medicationAdministrations.scheduledAt, addHours(new Date(), 2))))
    .orderBy(asc(medicationAdministrations.scheduledAt))
    .limit(8);

  return NextResponse.json(rows.map((row) => ({
    ...row,
    dueTime: row.scheduledAt ? new Date(row.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Now",
  })));
}
