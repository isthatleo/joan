import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { labOrders, labResults, patients, users } from "@/lib/db/schema";
import { resolveLabContext } from "@/lib/lab/server";

export const dynamic = "force-dynamic";

const patientNameSql = sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`;

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveLabContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  try {
    const status = request.nextUrl.searchParams.get("status")?.trim() || "";
    const limit = Number(request.nextUrl.searchParams.get("limit") || "100");
    const conditions = [eq(labOrders.tenantId, context.technician.tenantId), isNull(labOrders.deletedAt)];
    if (status) conditions.push(eq(labOrders.status, status));

    const orders = await db
      .select({
        id: labOrders.id,
        patientId: patients.id,
        patientName: patientNameSql,
        doctorId: users.id,
        doctorName: users.fullName,
        testType: labOrders.testName,
        testCode: labOrders.testCode,
        category: labOrders.category,
        status: labOrders.status,
        priority: labOrders.priority,
        orderedAt: labOrders.orderedAt,
        completedAt: labOrders.completedAt,
        dueDate: labOrders.dueDate,
        labLocation: labOrders.labLocation,
        notes: labOrders.notes,
        resultId: labResults.id,
      })
      .from(labOrders)
      .innerJoin(patients, eq(patients.id, labOrders.patientId))
      .leftJoin(users, eq(users.id, labOrders.doctorId))
      .leftJoin(labResults, and(eq(labResults.labOrderId, labOrders.id), isNull(labResults.deletedAt)))
      .where(and(...conditions))
      .orderBy(desc(labOrders.orderedAt))
      .limit(limit);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Failed to fetch lab orders:", error);
    return NextResponse.json({ error: "Failed to fetch lab orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const context = await resolveLabContext(request.headers, body.slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const patientId = String(body.patientId || "").trim();
  const testName = String(body.testName || body.testType || "").trim();
  if (!patientId || !testName) {
    return NextResponse.json({ error: "Patient and test name are required" }, { status: 400 });
  }

  try {
    const [created] = await db
      .insert(labOrders)
      .values({
        tenantId: context.technician.tenantId,
        patientId,
        doctorId: body.doctorId || null,
        orderedBy: context.technician.id,
        testName,
        testCode: body.testCode ? String(body.testCode).trim() : null,
        category: body.category ? String(body.category).trim() : "General",
        priority: body.priority ? String(body.priority).trim() : "routine",
        notes: body.notes ? String(body.notes).trim() : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        labLocation: body.labLocation ? String(body.labLocation).trim() : "Main Laboratory",
        status: "pending",
        orderedAt: new Date(),
      })
      .returning({ id: labOrders.id });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create lab order:", error);
    return NextResponse.json({ error: "Failed to create lab order" }, { status: 500 });
  }
}
