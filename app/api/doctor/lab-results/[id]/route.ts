import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, labOrders, labResults, notifications, patients, payments, roles, userRoles, users, visits } from "@/lib/db/schema";
import { resolveDoctorContext } from "@/lib/doctor/server";
import { parseLabResultData, serializeLabResultData } from "@/lib/doctor/lab-results";

function overallFlag(values: ReturnType<typeof parseLabResultData>["values"]) {
  if (values.some((value) => value.flag === "critical")) return "critical";
  if (values.some((value) => value.flag === "high")) return "high";
  if (values.some((value) => value.flag === "low")) return "low";
  if (values.some((value) => value.flag === "abnormal")) return "abnormal";
  return "normal";
}

async function loadResult(resultId: string, doctorId: string, tenantId: string) {
  const rows = await db
    .select({
      id: labResults.id,
      labOrderId: labOrders.id,
      patientId: patients.id,
      patientName: patients.fullName,
      patientEmail: patients.email,
      patientPhone: patients.phone,
      globalPatientId: patients.globalPatientId,
      testName: labOrders.testName,
      testCode: labOrders.testCode,
      category: labOrders.category,
      priority: labOrders.priority,
      orderStatus: labOrders.status,
      performedAt: labResults.createdAt,
      orderedAt: labOrders.orderedAt,
      dueDate: labOrders.dueDate,
      resultData: labResults.resultData,
      fileUrl: labResults.fileUrl,
      notes: labOrders.notes,
    })
    .from(labResults)
    .innerJoin(labOrders, eq(labOrders.id, labResults.labOrderId))
    .innerJoin(patients, eq(patients.id, labOrders.patientId))
    .where(
      and(
        eq(labResults.id, resultId),
        eq(labOrders.doctorId, doctorId),
        eq(labOrders.tenantId, tenantId),
        isNull(labOrders.deletedAt),
        isNull(labResults.deletedAt)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

async function notifyLabRecipients(tenantId: string, message: string, metadata: Record<string, unknown>) {
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
      type: "lab_follow_up",
      title: "Repeat or follow-up lab order requested",
      message,
      metadata,
      read: false,
    }))
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
    const row = await loadResult(id, doctor.id, doctor.tenantId!);
    if (!row) {
      return NextResponse.json({ error: "Lab result not found" }, { status: 404 });
    }

    const parsed = parseLabResultData(row.resultData, row.fileUrl);
    const paymentSummary = await db
      .select({
        invoiceId: invoices.id,
        paymentId: payments.id,
      })
      .from(invoices)
      .leftJoin(payments, eq(payments.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.tenantId, doctor.tenantId!),
          eq(invoices.patientId, row.patientId),
          isNull(invoices.deletedAt),
          isNull(payments.deletedAt)
        )
      )
      .limit(10);

    const hasPaymentAccess = paymentSummary.some((entry) => Boolean(entry.paymentId));

    return NextResponse.json({
      id: row.id,
      orderId: row.labOrderId,
      patientId: row.patientId,
      patientName: row.patientName,
      patientEmail: row.patientEmail,
      patientPhone: row.patientPhone,
      globalPatientId: row.globalPatientId,
      testName: row.testName,
      testCode: row.testCode,
      category: row.category,
      priority: row.priority,
      status: parsed.status,
      flag: overallFlag(parsed.values),
      summary: parsed.summary,
      values: parsed.values,
      notes: parsed.notes || row.notes,
      attachments: parsed.attachments,
      fileUrl: parsed.fileUrl,
      performedAt: row.performedAt,
      orderedAt: row.orderedAt,
      dueDate: row.dueDate,
      acceptedAt: parsed.acceptedAt,
      acceptedByDoctorName: parsed.acceptedByDoctorName,
      requestedRepeatAt: parsed.requestedRepeatAt,
      followUpOrderId: parsed.followUpOrderId,
      patientPortalEligible: hasPaymentAccess,
    });
  } catch (error) {
    console.error("Get doctor lab result error:", error);
    return NextResponse.json({ error: "Failed to fetch lab result" }, { status: 500 });
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
    const row = await loadResult(id, doctor.id, doctor.tenantId!);
    if (!row) {
      return NextResponse.json({ error: "Lab result not found" }, { status: 404 });
    }

    const parsed = parseLabResultData(row.resultData, row.fileUrl);
    const body = await request.json();
    const action = String(body.action || "").trim();

    if (action === "accept") {
      const accepted = {
        ...parsed,
        status: "accepted",
        acceptedAt: new Date().toISOString(),
        acceptedByDoctorId: doctor.id,
        acceptedByDoctorName: doctor.fullName || doctor.email,
      };

      const [updated] = await db
        .update(labResults)
        .set({ resultData: serializeLabResultData(accepted), updatedAt: new Date() })
        .where(eq(labResults.id, id))
        .returning();

      return NextResponse.json(updated);
    }

    if (action === "request-repeat") {
      const testName = String(body.testName || row.testName || "").trim();
      if (!testName) {
        return NextResponse.json({ error: "Test name is required for a follow-up order" }, { status: 400 });
      }

      const [visit] = await db
        .insert(visits)
        .values({
          tenantId: doctor.tenantId!,
          patientId: row.patientId,
          doctorId: doctor.id,
          reason: `Follow-up lab order: ${testName}`,
          notes: String(body.notes || parsed.notes || "").trim() || null,
        })
        .returning({ id: visits.id });

      const [followUpOrder] = await db
        .insert(labOrders)
        .values({
          tenantId: doctor.tenantId!,
          patientId: row.patientId,
          doctorId: doctor.id,
          visitId: visit.id,
          orderedBy: doctor.id,
          testName,
          testCode: String(body.testCode || row.testCode || testName.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 24)),
          category: String(body.category || row.category || "General"),
          priority: String(body.priority || row.priority || "routine"),
          status: "ordered",
          orderedAt: new Date(),
          notes: String(body.notes || "").trim() || parsed.notes || null,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          labLocation: String(body.labLocation || "Main Lab"),
        })
        .returning();

      const updatedResult = {
        ...parsed,
        requestedRepeatAt: new Date().toISOString(),
        followUpOrderId: followUpOrder.id,
      };

      await db
        .update(labResults)
        .set({ resultData: serializeLabResultData(updatedResult), updatedAt: new Date() })
        .where(eq(labResults.id, id));

      await notifyLabRecipients(
        doctor.tenantId!,
        `${testName} follow-up requested for ${row.patientName || "a patient"}.`,
        {
          labResultId: id,
          previousLabOrderId: row.labOrderId,
          followUpOrderId: followUpOrder.id,
          patientId: row.patientId,
          orderedBy: doctor.id,
        }
      );

      return NextResponse.json({ followUpOrder });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("Update doctor lab result error:", error);
    return NextResponse.json({ error: "Failed to update lab result" }, { status: 500 });
  }
}
