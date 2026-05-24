import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { labOrders, patients, users } from "@/lib/db/schema";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const order = await db
      .select({
        id: labOrders.id,
        patientId: patients.id,
        patientName: sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`,
        doctorId: users.id,
        doctorName: users.fullName,
        testType: labOrders.testName,
        testCode: labOrders.testCode,
        status: labOrders.status,
        priority: labOrders.priority,
        orderedAt: labOrders.orderedAt,
        completedAt: labOrders.completedAt,
        notes: labOrders.notes,
        labLocation: labOrders.labLocation,
        dueDate: labOrders.dueDate,
      })
      .from(labOrders)
      .innerJoin(patients, eq(patients.id, labOrders.patientId))
      .leftJoin(users, eq(users.id, labOrders.doctorId))
      .where(and(eq(labOrders.id, id), eq(labOrders.tenantId, session.user.tenantId), isNull(labOrders.deletedAt)))
      .limit(1);

    if (!order.length) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order[0]);
  } catch (error) {
    console.error("Failed to fetch lab order:", error);
    return NextResponse.json({ error: "Failed to fetch lab order" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const status = String(body.status || "").trim();

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(labOrders)
      .set({
        status,
        completedAt: status === "completed" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(labOrders.id, id), eq(labOrders.tenantId, session.user.tenantId), isNull(labOrders.deletedAt)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update lab order:", error);
    return NextResponse.json({ error: "Failed to update lab order" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const [deleted] = await db
      .update(labOrders)
      .set({ deletedAt: new Date(), updatedAt: new Date(), status: "cancelled" })
      .where(and(eq(labOrders.id, id), eq(labOrders.tenantId, session.user.tenantId), isNull(labOrders.deletedAt)))
      .returning({ id: labOrders.id });

    if (!deleted) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete lab order:", error);
    return NextResponse.json({ error: "Failed to delete lab order" }, { status: 500 });
  }
}
