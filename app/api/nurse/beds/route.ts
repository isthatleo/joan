import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { bedAssignments, patients } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveNurseContext } from "@/lib/nurse/server";
import { patientNameSql } from "@/lib/nurse/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveNurseContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const beds = await db
    .select({
      id: bedAssignments.id,
      bedNumber: bedAssignments.bedNumber,
      ward: bedAssignments.ward,
      floor: bedAssignments.ward,
      room: bedAssignments.room,
      status: bedAssignments.status,
      patientName: patientNameSql,
      patientId: patients.id,
      checkedInDate: bedAssignments.admissionDate,
      condition: bedAssignments.condition,
      notes: bedAssignments.notes,
    })
    .from(bedAssignments)
    .leftJoin(patients, eq(patients.id, bedAssignments.patientId))
    .where(and(eq(bedAssignments.tenantId, context.nurse.tenantId), isNull(bedAssignments.deletedAt)))
    .orderBy(asc(bedAssignments.ward), asc(bedAssignments.room), asc(bedAssignments.bedNumber));

  const stats = {
    total: beds.length,
    available: beds.filter((bed) => bed.status === "available").length,
    occupied: beds.filter((bed) => bed.status === "occupied").length,
    maintenance: beds.filter((bed) => bed.status === "maintenance").length,
  };

  return NextResponse.json({ beds, stats });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const context = await resolveNurseContext(request.headers, body.slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  if (!body.bedNumber || !body.ward) {
    return NextResponse.json({ error: "Bed number and ward are required" }, { status: 400 });
  }

  const [created] = await db
    .insert(bedAssignments)
    .values({
      tenantId: context.nurse.tenantId,
      patientId: body.patientId || null,
      bedNumber: body.bedNumber,
      ward: body.ward,
      room: body.room || null,
      status: body.status || (body.patientId ? "occupied" : "available"),
      assignedNurseId: context.nurse.id,
      admissionDate: body.patientId ? new Date() : null,
      condition: body.condition || null,
      notes: body.notes || null,
    })
    .returning({ id: bedAssignments.id });

  return NextResponse.json({ success: true, id: created.id });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const context = await resolveNurseContext(request.headers, body.slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  await db.update(bedAssignments).set({
    status: body.status,
    patientId: body.status === "occupied" ? body.patientId || null : null,
    admissionDate: body.status === "occupied" ? new Date() : null,
    dischargeDate: body.status === "available" ? new Date() : null,
    condition: body.condition || null,
    notes: body.notes || null,
    assignedNurseId: context.nurse.id,
    updatedAt: new Date(),
  }).where(and(eq(bedAssignments.id, body.id), eq(bedAssignments.tenantId, context.nurse.tenantId)));

  return NextResponse.json({ success: true });
}
