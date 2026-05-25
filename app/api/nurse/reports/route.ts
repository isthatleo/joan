import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { bedAssignments, carePlanTasks, carePlans, medicationAdministrations, patients, vitals, visits } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveNurseContext } from "@/lib/nurse/server";

export const dynamic = "force-dynamic";

const templates = [
  { id: "shift-handover", title: "Shift Handover", description: "Active patients, high-risk cases, pending medications, and unresolved tasks.", format: ["pdf", "html", "csv"], accent: "amber" },
  { id: "medication-compliance", title: "Medication Compliance", description: "Administration timeliness and missed medication tracking.", format: ["pdf", "csv", "html"], accent: "emerald" },
  { id: "vitals-exceptions", title: "Vitals Exceptions", description: "Abnormal vitals and escalations by patient and ward.", format: ["pdf", "html"], accent: "rose" },
  { id: "bed-occupancy", title: "Bed Occupancy", description: "Ward utilization, bed turnover, and discharge readiness.", format: ["pdf", "csv"], accent: "blue" },
];

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveNurseContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const tenantId = context.nurse.tenantId;

  const [patientCountRow] = await db.select({ count: sql<number>`count(*)::int` }).from(patients).where(and(eq(patients.tenantId, tenantId), isNull(patients.deletedAt)));
  const [activeBedsRow] = await db.select({ count: sql<number>`count(*)::int` }).from(bedAssignments).where(and(eq(bedAssignments.tenantId, tenantId), eq(bedAssignments.status, "occupied"), isNull(bedAssignments.deletedAt)));
  const [pendingMedsRow] = await db.select({ count: sql<number>`count(*)::int` }).from(medicationAdministrations).where(and(eq(medicationAdministrations.tenantId, tenantId), eq(medicationAdministrations.status, "pending"), isNull(medicationAdministrations.deletedAt)));
  const [taskRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(carePlanTasks)
    .innerJoin(carePlans, eq(carePlans.id, carePlanTasks.carePlanId))
    .where(and(eq(carePlans.tenantId, tenantId), sql`${carePlanTasks.status} <> 'completed'`, isNull(carePlanTasks.deletedAt)));
  const [vitalsRow] = await db.select({ count: sql<number>`count(*)::int` }).from(vitals).innerJoin(visits, eq(visits.id, vitals.visitId)).where(and(eq(visits.tenantId, tenantId), isNull(vitals.deletedAt)));

  return NextResponse.json({
    templates,
    stats: {
      totalPatients: patientCountRow?.count ?? 0,
      occupiedBeds: activeBedsRow?.count ?? 0,
      pendingMedications: pendingMedsRow?.count ?? 0,
      openCareTasks: taskRow?.count ?? 0,
      vitalsCaptured: vitalsRow?.count ?? 0,
    },
  });
}
