import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { bedAssignments, patients, users, vitals, visits } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveNurseContext } from "@/lib/nurse/server";
import { classifyVitalStatus, patientNameSql } from "@/lib/nurse/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const status = request.nextUrl.searchParams.get("status");
  const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();

  const context = await resolveNurseContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { nurse } = context;

  try {
    const rows = await db
      .select({
        id: vitals.id,
        patientId: patients.id,
        patientName: patientNameSql,
        patientRoom: bedAssignments.room,
        heartRate: vitals.heartRate,
        bloodPressure: vitals.bloodPressure,
        temperature: vitals.temperature,
        respiratoryRate: vitals.respiratoryRate,
        oxygenSaturation: vitals.oxygenSaturation,
        painScore: vitals.painScore,
        recordedAt: vitals.recordedAt,
        recordedBy: users.fullName,
        notes: vitals.notes,
      })
      .from(vitals)
      .innerJoin(visits, eq(visits.id, vitals.visitId))
      .innerJoin(patients, eq(patients.id, visits.patientId))
      .leftJoin(users, eq(users.id, vitals.recordedBy))
      .leftJoin(bedAssignments, and(eq(bedAssignments.patientId, patients.id), eq(bedAssignments.tenantId, nurse.tenantId), isNull(bedAssignments.deletedAt)))
      .where(and(eq(visits.tenantId, nurse.tenantId), isNull(vitals.deletedAt), isNull(visits.deletedAt)))
      .orderBy(desc(vitals.recordedAt));

    const latestByPatient = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!latestByPatient.has(row.patientId)) latestByPatient.set(row.patientId, row);
    }

    const data = [...latestByPatient.values()]
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
      .filter((row) => (status && status !== "all" ? row.status === status : true))
      .filter((row) => {
        if (!search) return true;
        return row.patientName.toLowerCase().includes(search) || String(row.patientRoom || "").toLowerCase().includes(search);
      });

    return NextResponse.json({ vitals: data, stats: {
      total: data.length,
      critical: data.filter((row) => row.status === "critical").length,
      warning: data.filter((row) => row.status === "warning").length,
      normal: data.filter((row) => row.status === "normal").length,
    }});
  } catch (error) {
    console.error("Nurse vitals API error:", error);
    return NextResponse.json({ error: "Failed to load vitals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const context = await resolveNurseContext(request.headers, body.slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { nurse } = context;
  const { patientId, heartRate, bloodPressure, temperature, respiratoryRate, oxygenSaturation, painScore, notes } = body;

  if (!patientId || !heartRate || !bloodPressure || !temperature || !respiratoryRate || !oxygenSaturation) {
    return NextResponse.json({ error: "Missing required vital fields" }, { status: 400 });
  }

  try {
    const [latestVisit] = await db
      .select({ id: visits.id })
      .from(visits)
      .where(and(eq(visits.tenantId, nurse.tenantId), eq(visits.patientId, patientId), isNull(visits.deletedAt)))
      .orderBy(desc(visits.createdAt))
      .limit(1);

    let visitId = latestVisit?.id;
    if (!visitId) {
      const [createdVisit] = await db.insert(visits).values({
        tenantId: nurse.tenantId,
        patientId,
        notes: "Nursing vitals record",
        reason: "Nursing observation",
      }).returning({ id: visits.id });
      visitId = createdVisit.id;
    }

    const [createdVital] = await db.insert(vitals).values({
      visitId,
      heartRate: String(heartRate),
      bloodPressure,
      temperature: String(temperature),
      respiratoryRate: String(respiratoryRate),
      oxygenSaturation: String(oxygenSaturation),
      painScore: painScore ? Number(painScore) : null,
      recordedBy: nurse.id,
      recordedAt: new Date(),
      notes: notes || null,
    }).returning({ id: vitals.id });

    return NextResponse.json({ success: true, id: createdVital.id });
  } catch (error) {
    console.error("Record vital API error:", error);
    return NextResponse.json({ error: "Failed to record vitals" }, { status: 500 });
  }
}
