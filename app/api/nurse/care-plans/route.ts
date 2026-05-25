import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { auditLogs, carePlanTasks, carePlans, patients } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveNurseContext } from "@/lib/nurse/server";
import { parseTextList, patientNameSql } from "@/lib/nurse/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveNurseContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const rows = await db
    .select({
      id: carePlans.id,
      patientId: patients.id,
      patientName: patientNameSql,
      title: carePlans.title,
      diagnosis: carePlans.diagnosis,
      goals: carePlans.goals,
      interventions: carePlans.interventions,
      status: carePlans.status,
      priority: carePlans.priority,
      startDate: carePlans.startDate,
      targetDate: carePlans.targetDate,
      notes: carePlans.notes,
      createdAt: carePlans.createdAt,
    })
    .from(carePlans)
    .innerJoin(patients, eq(patients.id, carePlans.patientId))
    .where(and(eq(carePlans.tenantId, context.nurse.tenantId), isNull(carePlans.deletedAt), isNull(patients.deletedAt)))
    .orderBy(desc(carePlans.createdAt));

  const planIds = rows.map((row) => row.id);
  const taskRows = planIds.length
    ? await db.select({
        id: carePlanTasks.id,
        carePlanId: carePlanTasks.carePlanId,
        title: carePlanTasks.title,
        description: carePlanTasks.description,
        dueAt: carePlanTasks.dueAt,
        completedAt: carePlanTasks.completedAt,
        status: carePlanTasks.status,
        notes: carePlanTasks.notes,
      }).from(carePlanTasks).where(and(inArray(carePlanTasks.carePlanId, planIds), isNull(carePlanTasks.deletedAt))).orderBy(asc(carePlanTasks.dueAt))
    : [];

  const tasksByPlan = new Map<string, typeof taskRows>();
  for (const row of taskRows) {
    tasksByPlan.set(row.carePlanId!, [...(tasksByPlan.get(row.carePlanId!) || []), row]);
  }

  const data = rows.map((row) => {
    const tasks = tasksByPlan.get(row.id) || [];
    return {
      ...row,
      goals: parseTextList(row.goals),
      interventionsList: parseTextList(row.interventions),
      tasks,
      progress: tasks.length ? Math.round((tasks.filter((task) => task.status === "completed").length / tasks.length) * 100) : 0,
    };
  });

  return NextResponse.json({
    carePlans: data,
    stats: {
      total: data.length,
      active: data.filter((row) => row.status === "active").length,
      completed: data.filter((row) => row.status === "completed").length,
      overdueTasks: taskRows.filter((row) => row.status !== "completed" && row.dueAt && new Date(row.dueAt) < new Date()).length,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const context = await resolveNurseContext(request.headers, body.slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { nurse } = context;
  if (!body.patientId || !body.title) {
    return NextResponse.json({ error: "Patient and title are required" }, { status: 400 });
  }

  const goals = Array.isArray(body.goals) ? body.goals.join("\n") : String(body.goals || "");
  const interventions = Array.isArray(body.interventions) ? body.interventions.join("\n") : String(body.interventions || "");

  const [plan] = await db.insert(carePlans).values({
    tenantId: nurse.tenantId,
    patientId: body.patientId,
    createdBy: nurse.id,
    assignedNurseId: nurse.id,
    title: body.title,
    diagnosis: body.diagnosis || null,
    goals,
    interventions,
    status: body.status || "active",
    priority: body.priority || "routine",
    startDate: body.startDate ? new Date(body.startDate) : new Date(),
    targetDate: body.targetDate ? new Date(body.targetDate) : null,
    notes: body.notes || null,
  }).returning({ id: carePlans.id });

  if (Array.isArray(body.tasks) && body.tasks.length) {
    await db.insert(carePlanTasks).values(
      body.tasks
        .filter((task: any) => task?.title)
        .map((task: any) => ({
          carePlanId: plan.id,
          assignedTo: nurse.id,
          title: task.title,
          description: task.description || null,
          dueAt: task.dueAt ? new Date(task.dueAt) : null,
          notes: task.notes || null,
        }))
    );
  }

  await db.insert(auditLogs).values({
    tenantId: nurse.tenantId,
    userId: nurse.id,
    action: "care_plan.created",
    entity: "care_plan",
    entityId: plan.id,
    metadata: { patientId: body.patientId },
  });

  return NextResponse.json({ success: true, id: plan.id });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const context = await resolveNurseContext(request.headers, body.slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { nurse } = context;

  if (body.action === "complete-task") {
    await db.update(carePlanTasks).set({ status: "completed", completedAt: new Date(), updatedAt: new Date() }).where(eq(carePlanTasks.id, body.taskId));
    return NextResponse.json({ success: true });
  }

  if (body.action === "update-status") {
    await db.update(carePlans).set({ status: body.status, completedAt: body.status === "completed" ? new Date() : null, updatedAt: new Date() }).where(and(eq(carePlans.id, body.id), eq(carePlans.tenantId, nurse.tenantId)));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unsupported care plan action" }, { status: 400 });
}
