import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { labOrders, labResults, notifications, patients, roles, userRoles, users, visits } from "@/lib/db/schema";
import { resolveDoctorContext } from "@/lib/doctor/server";

async function notifyLabUsers(tenantId: string, message: string, metadata: Record<string, unknown>) {
  const activeUsers = await db
    .select({
      id: users.id,
      baseRole: users.role,
      linkedRole: roles.name,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true), isNull(users.deletedAt)));

  const recipients = Array.from(
    new Set(
      activeUsers
        .filter((user) => {
          const roleNames = [user.baseRole, user.linkedRole].filter(Boolean).map((value) => String(value).toLowerCase());
          return roleNames.includes("lab_technician") || roleNames.includes("lab");
        })
        .map((user) => user.id)
    )
  );

  if (recipients.length === 0) return;

  await db.insert(notifications).values(
    recipients.map((userId) => ({
      tenantId,
      userId,
      type: "lab_order",
      title: "New lab order",
      message,
      metadata,
      read: false,
    }))
  );
}

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
    const category = request.nextUrl.searchParams.get("category")?.trim() || "all";
    const priority = request.nextUrl.searchParams.get("priority")?.trim() || "all";

    const conditions = [
      eq(labOrders.tenantId, doctor.tenantId),
      eq(labOrders.doctorId, doctor.id),
      isNull(labOrders.deletedAt),
    ];

    if (status !== "all") conditions.push(eq(labOrders.status, status));
    if (category !== "all") conditions.push(eq(labOrders.category, category));
    if (priority !== "all") conditions.push(eq(labOrders.priority, priority));
    if (search) {
      conditions.push(
        or(
          ilike(patients.firstName, `%${search}%`),
          ilike(patients.lastName, `%${search}%`),
          ilike(patients.globalPatientId, `%${search}%`),
          ilike(labOrders.testName, `%${search}%`),
          ilike(labOrders.testCode, `%${search}%`)
        )!
      );
    }

    const rows = await db
      .select({
        id: labOrders.id,
        patientId: labOrders.patientId,
        patientName: sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`,
        patientEmail: patients.email,
        patientPhone: patients.phone,
        globalPatientId: patients.globalPatientId,
        testName: labOrders.testName,
        testCode: labOrders.testCode,
        category: labOrders.category,
        priority: labOrders.priority,
        status: labOrders.status,
        orderedAt: labOrders.orderedAt,
        completedAt: labOrders.completedAt,
        dueDate: labOrders.dueDate,
        labLocation: labOrders.labLocation,
        notes: labOrders.notes,
        visitId: labOrders.visitId,
        resultId: labResults.id,
      })
      .from(labOrders)
      .innerJoin(patients, eq(patients.id, labOrders.patientId))
      .leftJoin(labResults, and(eq(labResults.labOrderId, labOrders.id), isNull(labResults.deletedAt)))
      .where(and(...conditions))
      .orderBy(desc(labOrders.orderedAt), desc(labOrders.createdAt));

    const [statsRow] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${labOrders.status} = 'ordered')::int`,
        inProgress: sql<number>`count(*) filter (where ${labOrders.status} = 'in_progress')::int`,
        completed: sql<number>`count(*) filter (where ${labOrders.status} = 'completed')::int`,
        critical: sql<number>`count(*) filter (where ${labOrders.priority} = 'critical')::int`,
      })
      .from(labOrders)
      .where(and(eq(labOrders.tenantId, doctor.tenantId), eq(labOrders.doctorId, doctor.id), isNull(labOrders.deletedAt)));

    return NextResponse.json({
      orders: rows,
      stats: {
        total: statsRow?.total ?? 0,
        pending: statsRow?.pending ?? 0,
        inProgress: statsRow?.inProgress ?? 0,
        completed: statsRow?.completed ?? 0,
        critical: statsRow?.critical ?? 0,
      },
    });
  } catch (error) {
    console.error("Doctor lab orders API error:", error);
    return NextResponse.json({ error: "Failed to fetch lab orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  if (!doctor.tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const patientId = String(body.patientId || "").trim();
    const testName = String(body.testName || "").trim();
    const category = String(body.category || "General").trim() || "General";

    if (!patientId || !testName) {
      return NextResponse.json({ error: "Patient and test name are required" }, { status: 400 });
    }

    const patient = await db.query.patients.findFirst({
      where: and(eq(patients.id, patientId), eq(patients.tenantId, doctor.tenantId), isNull(patients.deletedAt)),
      columns: { id: true, firstName: true, lastName: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const [visit] = await db
      .insert(visits)
      .values({
        tenantId: doctor.tenantId,
        patientId,
        doctorId: doctor.id,
        reason: `Lab order: ${testName}`,
        notes: String(body.notes || "").trim() || null,
      })
      .returning({ id: visits.id });

    const [created] = await db
      .insert(labOrders)
      .values({
        tenantId: doctor.tenantId,
        patientId,
        doctorId: doctor.id,
        visitId: visit.id,
        orderedBy: doctor.id,
        testName,
        testCode: String(body.testCode || testName.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 24)),
        category,
        priority: String(body.priority || "routine"),
        status: "ordered",
        orderedAt: new Date(),
        notes: String(body.notes || "").trim() || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        labLocation: String(body.labLocation || "Main Lab"),
      })
      .returning();

    const patientName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "A patient";
    await notifyLabUsers(
      doctor.tenantId,
      `${testName} was ordered for ${patientName}.`,
      {
        labOrderId: created.id,
        patientId,
        visitId: visit.id,
        orderedBy: doctor.id,
      }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Create doctor lab order API error:", error);
    return NextResponse.json({ error: "Failed to create lab order" }, { status: 500 });
  }
}
