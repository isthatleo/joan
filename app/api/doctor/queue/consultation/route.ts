import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { labOrders, notifications, patientConditions, patients, queues, roles, userRoles, users, visits } from "@/lib/db/schema";
import { resolveDoctorContext } from "@/lib/doctor/server";

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
    const queueId = String(body.queueId || "").trim();
    const patientId = String(body.patientId || "").trim();
    const reason = String(body.reason || "Consultation").trim();
    const symptoms = String(body.symptoms || "").trim();
    const examination = String(body.examination || "").trim();
    const assessment = String(body.assessment || "").trim();
    const diagnosis = String(body.diagnosis || "").trim();
    const plan = String(body.plan || "").trim();
    const followUp = String(body.followUp || "").trim();
    const notes = String(body.notes || "").trim();
    const createLabOrder = Boolean(body.createLabOrder);
    const labTestName = String(body.labTestName || "").trim();
    const labCategory = String(body.labCategory || "General").trim() || "General";
    const labPriority = String(body.labPriority || "routine").trim() || "routine";
    const labNotes = String(body.labNotes || "").trim();
    const labLocation = String(body.labLocation || "Main Lab").trim() || "Main Lab";
    const dueDate = body.dueDate ? new Date(body.dueDate) : null;

    if (!queueId || !patientId || !symptoms || !assessment || !plan) {
      return NextResponse.json({ error: "Queue, patient, symptoms, assessment, and plan are required" }, { status: 400 });
    }

    if (createLabOrder && !labTestName) {
      return NextResponse.json({ error: "Lab test name is required when creating a lab order" }, { status: 400 });
    }

    const queueEntry = await db.query.queues.findFirst({
      where: and(
        eq(queues.id, queueId),
        eq(queues.tenantId, doctor.tenantId),
        eq(queues.assignedTo, doctor.id),
        isNull(queues.deletedAt)
      ),
      columns: { id: true, status: true },
    });

    if (!queueEntry) {
      return NextResponse.json({ error: "Queue entry not found" }, { status: 404 });
    }

    if (queueEntry.status === "completed" || queueEntry.status === "no-show") {
      return NextResponse.json({ error: "This queue entry is already closed" }, { status: 400 });
    }

    const patient = await db.query.patients.findFirst({
      where: and(eq(patients.id, patientId), eq(patients.tenantId, doctor.tenantId), isNull(patients.deletedAt)),
      columns: { id: true, firstName: true, lastName: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const compiledNotes = [
      `Presenting Symptoms: ${symptoms}`,
      examination ? `Examination Findings: ${examination}` : null,
      `Assessment: ${assessment}`,
      diagnosis ? `Diagnosis: ${diagnosis}` : null,
      `Treatment Plan: ${plan}`,
      followUp ? `Follow-up Instructions: ${followUp}` : null,
      notes ? `Clinical Notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const [visit] = await db
      .insert(visits)
      .values({
        tenantId: doctor.tenantId,
        patientId,
        doctorId: doctor.id,
        reason,
        notes: compiledNotes,
      })
      .returning();

    if (diagnosis) {
      await db.insert(patientConditions).values({ patientId, condition: diagnosis });
    }

    let createdLabOrder: { id: string } | null = null;
    if (createLabOrder) {
      [createdLabOrder] = await db
        .insert(labOrders)
        .values({
          tenantId: doctor.tenantId,
          patientId,
          doctorId: doctor.id,
          visitId: visit.id,
          orderedBy: doctor.id,
          testName: labTestName,
          testCode: labTestName.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 24),
          category: labCategory,
          priority: labPriority,
          status: "ordered",
          orderedAt: new Date(),
          notes: labNotes || notes || null,
          dueDate,
          labLocation,
        })
        .returning({ id: labOrders.id });

      const activeUsers = await db
        .select({
          id: users.id,
          baseRole: users.role,
          linkedRole: roles.name,
        })
        .from(users)
        .leftJoin(userRoles, eq(userRoles.userId, users.id))
        .leftJoin(roles, eq(roles.id, userRoles.roleId))
        .where(and(eq(users.tenantId, doctor.tenantId), eq(users.isActive, true), isNull(users.deletedAt)));

      const labRecipients = Array.from(
        new Set(
          activeUsers
            .filter((user) => {
              const roleNames = [user.baseRole, user.linkedRole].filter(Boolean).map((value) => String(value).toLowerCase());
              return roleNames.includes("lab_technician") || roleNames.includes("lab");
            })
            .map((user) => user.id)
        )
      );

      if (labRecipients.length > 0) {
        const patientName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "A patient";
        await db.insert(notifications).values(
          labRecipients.map((userId) => ({
            tenantId: doctor.tenantId,
            userId,
            type: "lab_order",
            title: "New lab order",
            message: `${labTestName} ordered for ${patientName}.`,
            metadata: {
              queueId,
              patientId,
              visitId: visit.id,
              labOrderId: createdLabOrder?.id || null,
              orderedBy: doctor.id,
            },
            read: false,
          }))
        );
      }
    }

    await db
      .update(queues)
      .set({ status: "completed", completedAt: new Date() })
      .where(and(eq(queues.id, queueId), eq(queues.tenantId, doctor.tenantId), eq(queues.assignedTo, doctor.id)));

    return NextResponse.json({ visit, labOrder: createdLabOrder }, { status: 201 });
  } catch (error) {
    console.error("Doctor consultation API error:", error);
    return NextResponse.json({ error: "Failed to complete consultation" }, { status: 500 });
  }
}
