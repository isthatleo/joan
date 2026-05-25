import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { labOrders, labResults, patients, users } from "@/lib/db/schema";
import { resolveLabContext } from "@/lib/lab/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveLabContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  try {
    const { id } = await params;
    const rows = await db
      .select({
        id: labOrders.id,
        patientId: patients.id,
        patientName: sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`,
        doctorId: users.id,
        doctorName: users.fullName,
        testType: labOrders.testName,
        testCode: labOrders.testCode,
        category: labOrders.category,
        status: labOrders.status,
        priority: labOrders.priority,
        orderedAt: labOrders.orderedAt,
        collectedAt: labOrders.collectedAt,
        completedAt: labOrders.completedAt,
        dueDate: labOrders.dueDate,
        labLocation: labOrders.labLocation,
        notes: labOrders.notes,
        results: labOrders.results,
        resultId: labResults.id,
      })
      .from(labOrders)
      .innerJoin(patients, eq(patients.id, labOrders.patientId))
      .leftJoin(users, eq(users.id, labOrders.doctorId))
      .leftJoin(labResults, and(eq(labResults.labOrderId, labOrders.id), isNull(labResults.deletedAt)))
      .where(and(eq(labOrders.id, id), eq(labOrders.tenantId, context.technician.tenantId), isNull(labOrders.deletedAt)))
      .limit(1);

    if (!rows.length) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Failed to fetch lab order:", error);
    return NextResponse.json({ error: "Failed to fetch lab order" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const context = await resolveLabContext(request.headers, body.slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  try {
    const { id } = await params;
    const status = body.status ? String(body.status).trim() : null;
    const [updated] = await db
      .update(labOrders)
      .set({
        status: status || undefined,
        notes: body.notes !== undefined ? String(body.notes || "") || null : undefined,
        collectedAt: status === "in-progress" ? new Date() : undefined,
        completedAt: status === "completed" ? new Date() : body.completedAt === null ? null : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(labOrders.id, id), eq(labOrders.tenantId, context.technician.tenantId), isNull(labOrders.deletedAt)))
      .returning({ id: labOrders.id, status: labOrders.status });

    if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update lab order:", error);
    return NextResponse.json({ error: "Failed to update lab order" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveLabContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  try {
    const { id } = await params;
    const [updated] = await db
      .update(labOrders)
      .set({ status: "cancelled", deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(labOrders.id, id), eq(labOrders.tenantId, context.technician.tenantId), isNull(labOrders.deletedAt)))
      .returning({ id: labOrders.id });

    if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel lab order:", error);
    return NextResponse.json({ error: "Failed to cancel lab order" }, { status: 500 });
  }
}
