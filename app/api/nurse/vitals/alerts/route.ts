import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { bedAssignments, patients, vitals, visits } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveNurseContext } from "@/lib/nurse/server";
import { classifyVitalStatus, patientNameSql } from "@/lib/nurse/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveNurseContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const rows = await db
    .select({
      id: vitals.id,
      patientName: patientNameSql,
      room: bedAssignments.room,
      temperature: vitals.temperature,
      bloodPressure: vitals.bloodPressure,
      heartRate: vitals.heartRate,
      respiratoryRate: vitals.respiratoryRate,
      oxygenSaturation: vitals.oxygenSaturation,
      painScore: vitals.painScore,
      recordedAt: vitals.recordedAt,
    })
    .from(vitals)
    .innerJoin(visits, eq(visits.id, vitals.visitId))
    .innerJoin(patients, eq(patients.id, visits.patientId))
    .leftJoin(bedAssignments, and(eq(bedAssignments.patientId, patients.id), eq(bedAssignments.tenantId, context.nurse.tenantId), isNull(bedAssignments.deletedAt)))
    .where(and(eq(visits.tenantId, context.nurse.tenantId), isNull(vitals.deletedAt), isNull(visits.deletedAt)))
    .orderBy(desc(vitals.recordedAt))
    .limit(20);

  const data = rows
    .map((row) => ({
      ...row,
      status: classifyVitalStatus({
        heartRate: Number(row.heartRate || 0),
        temperature: Number(row.temperature || 0),
        respiratoryRate: Number(row.respiratoryRate || 0),
        oxygenSaturation: Number(row.oxygenSaturation || 0),
        painScore: row.painScore,
        bloodPressure: row.bloodPressure,
      }),
    }))
    .filter((row) => row.status !== "normal")
    .slice(0, 8);

  return NextResponse.json(data.map((row) => ({
    id: row.id,
    patientName: row.patientName,
    room: row.room,
    alertType: row.status === "critical" ? "Critical vitals" : "Warning vitals",
    value: `BP ${row.bloodPressure} · HR ${row.heartRate}`,
    unit: "",
    recordedAt: row.recordedAt,
    status: row.status,
  })));
}
