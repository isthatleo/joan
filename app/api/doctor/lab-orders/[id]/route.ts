import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { labOrders, notifications, patients, roles, userRoles, users } from "@/lib/db/schema";
import { resolveDoctorContext } from "@/lib/doctor/server";

async function resolveLabRecipients(tenantId: string) {
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

  return Array.from(
    new Set(
      activeUsers
        .filter((user) => {
          const roleNames = [user.baseRole, user.linkedRole].filter(Boolean).map((value) => String(value).toLowerCase());
          return roleNames.includes("lab_technician") || roleNames.includes("lab");
        })
        .map((user) => user.id)
    )
  );
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  const { id } = await params;

  try {
    const order = await db
      .select({
        id: labOrders.id,
        patientId: labOrders.patientId,
        patientName: patients.fullName,
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
      })
      .from(labOrders)
      .innerJoin(patients, eq(patients.id, labOrders.patientId))
      .where(and(eq(labOrders.id, id), eq(labOrders.tenantId, doctor.tenantId!), eq(labOrders.doctorId, doctor.id), isNull(labOrders.deletedAt)))
      .limit(1);

    if (!order.length) {
      return NextResponse.json({ error: "Lab order not found" }, { status: 404 });
    }

    return NextResponse.json(order[0]);
  } catch (error) {
    console.error("Get doctor lab order error:", error);
    return NextResponse.json({ error: "Failed to fetch lab order" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  const { id } = await params;

  try {
    const body = await request.json();
    const status = body.status ? String(body.status) : undefined;

    const updateData: Record<string, unknown> = {};
    if (body.testName) updateData.testName = String(body.testName);
    if (body.testCode) updateData.testCode = String(body.testCode);
    if (body.category) updateData.category = String(body.category);
    if (body.priority) updateData.priority = String(body.priority);
    if (body.notes !== undefined) updateData.notes = String(body.notes || "") || null;
    if (body.labLocation) updateData.labLocation = String(body.labLocation);
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (status) updateData.status = status;
    if (status === "completed") updateData.completedAt = new Date();
    if (status === "ordered") updateData.completedAt = null;

    const [updated] = await db
      .update(labOrders)
      .set(updateData)
      .where(and(eq(labOrders.id, id), eq(labOrders.tenantId, doctor.tenantId!), eq(labOrders.doctorId, doctor.id), isNull(labOrders.deletedAt)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Lab order not found" }, { status: 404 });
    }

    if (status === "cancelled") {
      const labRecipients = await resolveLabRecipients(doctor.tenantId!);
      if (labRecipients.length > 0) {
        await db.insert(notifications).values(
          labRecipients.map((userId) => ({
            tenantId: doctor.tenantId!,
            userId,
            type: "lab_order_cancelled",
            title: "Lab order cancelled",
            message: `${updated.testName || "A lab order"} has been cancelled by the ordering doctor.`,
            metadata: { labOrderId: updated.id, patientId: updated.patientId },
            read: false,
          }))
        );
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update doctor lab order error:", error);
    return NextResponse.json({ error: "Failed to update lab order" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  const { id } = await params;

  try {
    const [deleted] = await db
      .update(labOrders)
      .set({ deletedAt: new Date(), status: "cancelled" })
      .where(and(eq(labOrders.id, id), eq(labOrders.tenantId, doctor.tenantId!), eq(labOrders.doctorId, doctor.id), isNull(labOrders.deletedAt)))
      .returning({ id: labOrders.id });

    if (!deleted) {
      return NextResponse.json({ error: "Lab order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete doctor lab order error:", error);
    return NextResponse.json({ error: "Failed to cancel lab order" }, { status: 500 });
  }
}
