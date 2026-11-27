import { and, desc, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  labOrders,
  labResults,
  patientAllergies,
  patientConditions,
  patients,
  prescriptions,
  queues,
  visits,
  vitals,
} from "@/lib/db/schema";
import { parseLabResultData } from "@/lib/doctor/lab-results";
import type { CopilotContext, CopilotFact, CopilotOverview, CopilotPriority } from "./types";

const DETAIL_LIMIT = 320;

type NameParts = {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

function text(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function clip(value: string, max = DETAIL_LIMIT): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function displayName(row: NameParts): string {
  return text(`${row.firstName || ""} ${row.lastName || ""}`.trim()) || text(row.fullName) || "Patient";
}

function firstNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function labPriority(flag: string): CopilotPriority {
  if (flag === "critical") return "critical";
  if (flag === "high" || flag === "low" || flag === "abnormal") return "urgent";
  return "routine";
}

function vitalPriority(row: {
  bloodPressure: string | null;
  heartRate: string | null;
  oxygenSaturation: string | null;
  painScore: number | null;
}): CopilotPriority {
  const systolic = firstNumber(row.bloodPressure);
  const heartRate = firstNumber(row.heartRate);
  const oxygen = firstNumber(row.oxygenSaturation);

  if (
    (systolic !== null && (systolic >= 180 || systolic <= 90)) ||
    (oxygen !== null && oxygen < 92)
  ) {
    return "critical";
  }

  if (
    (row.painScore ?? 0) >= 7 ||
    (heartRate !== null && (heartRate > 120 || heartRate < 50)) ||
    (oxygen !== null && oxygen < 95) ||
    (systolic !== null && systolic >= 160)
  ) {
    return "urgent";
  }

  return "routine";
}

const PRIORITY_RANK: Record<CopilotPriority, number> = {
  critical: 4,
  urgent: 3,
  routine: 2,
  info: 1,
};

function sortFacts(facts: CopilotFact[]) {
  facts.sort(
    (a, b) =>
      PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
      String(b.timestamp || "").localeCompare(String(a.timestamp || ""))
  );
  return facts;
}

function makeFact(params: {
  category: CopilotFact["category"];
  patientId: string | null;
  patientName: string | null;
  label: string;
  detail: string;
  priority: CopilotPriority;
  timestamp: string | null;
  table: string;
  recordId: string;
  field?: string;
}): CopilotFact {
  return {
    id: `${params.category}:${params.recordId}:${params.field || ""}`,
    category: params.category,
    patientId: params.patientId,
    patientName: params.patientName,
    label: params.label,
    detail: clip(params.detail),
    priority: params.priority,
    timestamp: params.timestamp,
    sourceRef: {
      table: params.table,
      id: params.recordId,
      field: params.field,
      label: params.label,
    },
  };
}

function countsFromFacts(facts: CopilotFact[]): CopilotOverview {
  return {
    labResultsToReview: facts.filter((fact) => fact.category === "lab" && fact.priority !== "routine").length,
    prescriptionRefillsToReview: facts.filter((fact) => fact.category === "prescription").length,
    urgentQueueCount: facts.filter(
      (fact) => fact.category === "queue" && (fact.priority === "critical" || fact.priority === "urgent")
    ).length,
    queueWaitingCount: facts.filter((fact) => fact.category === "queue").length,
  };
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const weekAgo = new Date(start);
  weekAgo.setDate(weekAgo.getDate() - 7);

  return { start, end, weekAgo };
}

export async function buildHandoffContext({
  doctorId,
  tenantId,
}: {
  doctorId: string;
  tenantId: string;
}): Promise<CopilotContext> {
  const { start, end, weekAgo } = todayRange();

  const [queueRows, appointmentRows, labRows, prescriptionRows, vitalRows] = await Promise.all([
    db
      .select({
        id: queues.id,
        patientId: queues.patientId,
        queueNumber: queues.queueNumber,
        status: queues.status,
        priority: queues.priority,
        position: queues.position,
        createdAt: queues.createdAt,
        fullName: patients.fullName,
        firstName: patients.firstName,
        lastName: patients.lastName,
      })
      .from(queues)
      .innerJoin(patients, eq(patients.id, queues.patientId))
      .where(
        and(
          eq(queues.tenantId, tenantId),
          eq(queues.assignedTo, doctorId),
          inArray(queues.status, ["waiting", "called", "in-progress"]),
          isNull(queues.deletedAt),
          eq(patients.tenantId, tenantId),
          isNull(patients.deletedAt)
        )
      )
      .orderBy(desc(queues.createdAt))
      .limit(20),
    db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        scheduledAt: appointments.scheduledAt,
        status: appointments.status,
        fullName: patients.fullName,
        firstName: patients.firstName,
        lastName: patients.lastName,
      })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          eq(appointments.doctorId, doctorId),
          gte(appointments.scheduledAt, start),
          lt(appointments.scheduledAt, end),
          isNull(appointments.deletedAt),
          eq(patients.tenantId, tenantId),
          isNull(patients.deletedAt)
        )
      )
      .orderBy(appointments.scheduledAt)
      .limit(20),
    db
      .select({
        id: labResults.id,
        resultData: labResults.resultData,
        fileUrl: labResults.fileUrl,
        createdAt: labResults.createdAt,
        testName: labOrders.testName,
        patientId: labOrders.patientId,
        fullName: patients.fullName,
        firstName: patients.firstName,
        lastName: patients.lastName,
      })
      .from(labResults)
      .innerJoin(labOrders, eq(labOrders.id, labResults.labOrderId))
      .innerJoin(patients, eq(patients.id, labOrders.patientId))
      .where(
        and(
          eq(labResults.tenantId, tenantId),
          eq(labOrders.tenantId, tenantId),
          eq(labOrders.doctorId, doctorId),
          isNull(labResults.deletedAt),
          isNull(labOrders.deletedAt),
          eq(patients.tenantId, tenantId),
          isNull(patients.deletedAt)
        )
      )
      .orderBy(desc(labResults.createdAt))
      .limit(30),
    db
      .select({
        id: prescriptions.id,
        patientId: prescriptions.patientId,
        medication: prescriptions.medication,
        strength: prescriptions.strength,
        dosage: prescriptions.dosage,
        frequency: prescriptions.frequency,
        status: prescriptions.status,
        priority: prescriptions.priority,
        isEmergency: prescriptions.isEmergency,
        refills: prescriptions.refills,
        refillsRemaining: prescriptions.refillsRemaining,
        prescribedAt: prescriptions.prescribedAt,
        fullName: patients.fullName,
        firstName: patients.firstName,
        lastName: patients.lastName,
      })
      .from(prescriptions)
      .innerJoin(patients, eq(patients.id, prescriptions.patientId))
      .where(
        and(
          eq(prescriptions.tenantId, tenantId),
          eq(prescriptions.doctorId, doctorId),
          isNull(prescriptions.deletedAt),
          eq(patients.tenantId, tenantId),
          isNull(patients.deletedAt)
        )
      )
      .orderBy(desc(prescriptions.prescribedAt))
      .limit(30),
    db
      .select({
        id: vitals.id,
        patientId: visits.patientId,
        bloodPressure: vitals.bloodPressure,
        heartRate: vitals.heartRate,
        oxygenSaturation: vitals.oxygenSaturation,
        painScore: vitals.painScore,
        recordedAt: vitals.recordedAt,
        notes: vitals.notes,
        fullName: patients.fullName,
        firstName: patients.firstName,
        lastName: patients.lastName,
      })
      .from(vitals)
      .innerJoin(visits, eq(visits.id, vitals.visitId))
      .innerJoin(patients, eq(patients.id, visits.patientId))
      .where(
        and(
          eq(visits.tenantId, tenantId),
          eq(visits.doctorId, doctorId),
          gte(vitals.recordedAt, weekAgo),
          isNull(vitals.deletedAt),
          isNull(visits.deletedAt),
          eq(patients.tenantId, tenantId),
          isNull(patients.deletedAt)
        )
      )
      .orderBy(desc(vitals.recordedAt))
      .limit(40),
  ]);

  const facts: CopilotFact[] = [];

  for (const row of queueRows) {
    const waitMinutes = row.createdAt
      ? Math.max(0, Math.round((Date.now() - row.createdAt.getTime()) / 60_000))
      : null;
    const priority: CopilotPriority =
      row.priority === "critical" ? "critical" : row.priority === "urgent" ? "urgent" : "routine";

    facts.push(
      makeFact({
        category: "queue",
        patientId: row.patientId,
        patientName: displayName(row),
        label: `Queue ${text(row.queueNumber, "item")}`,
        detail: [
          `status ${text(row.status, "waiting")}`,
          `priority ${text(row.priority, "routine")}`,
          row.position !== null ? `position ${row.position}` : null,
          waitMinutes !== null ? `waiting ${waitMinutes} minutes` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        priority,
        timestamp: iso(row.createdAt),
        table: "queues",
        recordId: row.id,
        field: "status",
      })
    );
  }

  for (const row of appointmentRows) {
    const time = row.scheduledAt ? row.scheduledAt.toISOString().slice(11, 16) : "time not set";
    const active = ["checked-in", "in-progress"].includes(String(row.status || "").toLowerCase());
    facts.push(
      makeFact({
        category: "appointment",
        patientId: row.patientId,
        patientName: displayName(row),
        label: "Today's appointment",
        detail: `${time} · status ${text(row.status, "scheduled")}`,
        priority: active ? "urgent" : "routine",
        timestamp: iso(row.scheduledAt),
        table: "appointments",
        recordId: row.id,
        field: "scheduledAt",
      })
    );
  }

  for (const row of labRows) {
    const parsed = parseLabResultData(row.resultData, row.fileUrl);
    const needsReview = parsed.flag !== "normal" || /review|pending/i.test(parsed.status);
    if (!needsReview) continue;

    const flaggedValues = parsed.values
      .filter((value) => value.flag !== "normal")
      .slice(0, 3)
      .map((value) => `${value.name}: ${value.value}${value.unit ? ` ${value.unit}` : ""} (${value.flag})`)
      .join("; ");

    facts.push(
      makeFact({
        category: "lab",
        patientId: row.patientId,
        patientName: displayName(row),
        label: `Lab result · ${text(row.testName, "test")}`,
        detail: [clip(parsed.summary, 180), flaggedValues].filter(Boolean).join(". "),
        priority: labPriority(parsed.flag),
        timestamp: iso(row.createdAt),
        table: "lab_results",
        recordId: row.id,
        field: "resultData",
      })
    );
  }

  for (const row of prescriptionRows) {
    const status = text(row.status, "unknown");
    const priorityLabel = text(row.priority, "routine");
    const needsReview =
      Boolean(row.isEmergency) ||
      ["urgent", "critical", "stat"].includes(priorityLabel.toLowerCase()) ||
      status.toLowerCase() === "pending" ||
      ((row.refills ?? 0) > 0 && (row.refillsRemaining ?? 0) <= 0);
    if (!needsReview) continue;

    facts.push(
      makeFact({
        category: "prescription",
        patientId: row.patientId,
        patientName: displayName(row),
        label: `Prescription · ${text(row.medication, "medication")}`,
        detail: [
          [text(row.strength), text(row.dosage), text(row.frequency)].filter(Boolean).join(" · "),
          `status ${status}`,
          `priority ${priorityLabel}`,
          `refills remaining ${row.refillsRemaining ?? 0}`,
        ]
          .filter(Boolean)
          .join(" · "),
        priority: row.isEmergency || priorityLabel.toLowerCase() === "critical" ? "critical" : "urgent",
        timestamp: iso(row.prescribedAt),
        table: "prescriptions",
        recordId: row.id,
        field: "status",
      })
    );
  }

  for (const row of vitalRows) {
    const priority = vitalPriority(row);
    if (priority === "routine") continue;

    facts.push(
      makeFact({
        category: "vitals",
        patientId: row.patientId,
        patientName: displayName(row),
        label: "Vital signs",
        detail: [
          row.bloodPressure ? `BP ${row.bloodPressure}` : null,
          row.heartRate ? `HR ${row.heartRate}` : null,
          row.oxygenSaturation ? `SpO2 ${row.oxygenSaturation}` : null,
          row.painScore !== null ? `pain ${row.painScore}/10` : null,
          row.notes ? text(row.notes) : null,
        ]
          .filter(Boolean)
          .join(" · "),
        priority,
        timestamp: iso(row.recordedAt),
        table: "vitals",
        recordId: row.id,
        field: "recordedAt",
      })
    );
  }

  const patientIds = Array.from(
    new Set(facts.map((fact) => fact.patientId).filter((id): id is string => Boolean(id)))
  );

  if (patientIds.length > 0) {
    const [conditionRows, allergyRows] = await Promise.all([
      db
        .select({
          id: patientConditions.id,
          patientId: patientConditions.patientId,
          condition: patientConditions.condition,
          createdAt: patientConditions.createdAt,
          fullName: patients.fullName,
          firstName: patients.firstName,
          lastName: patients.lastName,
        })
        .from(patientConditions)
        .innerJoin(patients, eq(patients.id, patientConditions.patientId))
        .where(
          and(
            inArray(patientConditions.patientId, patientIds),
            eq(patients.tenantId, tenantId),
            isNull(patientConditions.deletedAt),
            isNull(patients.deletedAt)
          )
        )
        .orderBy(desc(patientConditions.createdAt))
        .limit(30),
      db
        .select({
          id: patientAllergies.id,
          patientId: patientAllergies.patientId,
          allergy: patientAllergies.allergy,
          createdAt: patientAllergies.createdAt,
          fullName: patients.fullName,
          firstName: patients.firstName,
          lastName: patients.lastName,
        })
        .from(patientAllergies)
        .innerJoin(patients, eq(patients.id, patientAllergies.patientId))
        .where(
          and(
            inArray(patientAllergies.patientId, patientIds),
            eq(patients.tenantId, tenantId),
            isNull(patientAllergies.deletedAt),
            isNull(patients.deletedAt)
          )
        )
        .orderBy(desc(patientAllergies.createdAt))
        .limit(30),
    ]);

    for (const row of conditionRows) {
      facts.push(
        makeFact({
          category: "condition",
          patientId: row.patientId,
          patientName: displayName(row),
          label: "Recorded condition",
          detail: text(row.condition, "Condition on file"),
          priority: "routine",
          timestamp: iso(row.createdAt),
          table: "patient_conditions",
          recordId: row.id,
          field: "condition",
        })
      );
    }

    for (const row of allergyRows) {
      facts.push(
        makeFact({
          category: "allergy",
          patientId: row.patientId,
          patientName: displayName(row),
          label: "Recorded allergy",
          detail: text(row.allergy, "Allergy on file"),
          priority: "urgent",
          timestamp: iso(row.createdAt),
          table: "patient_allergies",
          recordId: row.id,
          field: "allergy",
        })
      );
    }
  }

  const sortedFacts = sortFacts(facts);

  return {
    facts: sortedFacts,
    allowedPatientIds: patientIds,
    generatedAt: new Date().toISOString(),
    counts: countsFromFacts(sortedFacts),
  };
}

export async function buildPatientContext({
  doctorId,
  tenantId,
  patientId,
  queueId,
}: {
  doctorId: string;
  tenantId: string;
  patientId: string;
  queueId?: string;
}): Promise<CopilotContext | null> {
  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.id, patientId), eq(patients.tenantId, tenantId), isNull(patients.deletedAt)),
    columns: { id: true, fullName: true, firstName: true, lastName: true },
  });
  if (!patient) return null;

  if (queueId) {
    const queueEntry = await db.query.queues.findFirst({
      where: and(
        eq(queues.id, queueId),
        eq(queues.tenantId, tenantId),
        eq(queues.assignedTo, doctorId),
        eq(queues.patientId, patientId),
        isNull(queues.deletedAt)
      ),
      columns: { id: true },
    });
    if (!queueEntry) return null;
  }

  const patientName = displayName(patient);

  const [visitRows, labRows, vitalRows, prescriptionRows, conditionRows, allergyRows, appointmentRows] =
    await Promise.all([
      db
        .select({ id: visits.id, reason: visits.reason, notes: visits.notes, createdAt: visits.createdAt })
        .from(visits)
        .where(
          and(
            eq(visits.tenantId, tenantId),
            eq(visits.patientId, patientId),
            eq(visits.doctorId, doctorId),
            isNull(visits.deletedAt)
          )
        )
        .orderBy(desc(visits.createdAt))
        .limit(6),
      db
        .select({
          id: labResults.id,
          resultData: labResults.resultData,
          fileUrl: labResults.fileUrl,
          createdAt: labResults.createdAt,
          testName: labOrders.testName,
          status: labOrders.status,
        })
        .from(labResults)
        .innerJoin(labOrders, eq(labOrders.id, labResults.labOrderId))
        .where(
          and(
            eq(labResults.tenantId, tenantId),
            eq(labOrders.tenantId, tenantId),
            eq(labOrders.doctorId, doctorId),
            eq(labOrders.patientId, patientId),
            isNull(labResults.deletedAt),
            isNull(labOrders.deletedAt)
          )
        )
        .orderBy(desc(labResults.createdAt))
        .limit(6),
      db
        .select({
          id: vitals.id,
          bloodPressure: vitals.bloodPressure,
          heartRate: vitals.heartRate,
          oxygenSaturation: vitals.oxygenSaturation,
          painScore: vitals.painScore,
          recordedAt: vitals.recordedAt,
          notes: vitals.notes,
        })
        .from(vitals)
        .innerJoin(visits, eq(visits.id, vitals.visitId))
        .where(
          and(
            eq(visits.tenantId, tenantId),
            eq(visits.doctorId, doctorId),
            eq(visits.patientId, patientId),
            isNull(vitals.deletedAt),
            isNull(visits.deletedAt)
          )
        )
        .orderBy(desc(vitals.recordedAt))
        .limit(8),
      db
        .select({
          id: prescriptions.id,
          medication: prescriptions.medication,
          strength: prescriptions.strength,
          dosage: prescriptions.dosage,
          frequency: prescriptions.frequency,
          status: prescriptions.status,
          priority: prescriptions.priority,
          isEmergency: prescriptions.isEmergency,
          refillsRemaining: prescriptions.refillsRemaining,
          prescribedAt: prescriptions.prescribedAt,
        })
        .from(prescriptions)
        .where(
          and(
            eq(prescriptions.tenantId, tenantId),
            eq(prescriptions.doctorId, doctorId),
            eq(prescriptions.patientId, patientId),
            isNull(prescriptions.deletedAt)
          )
        )
        .orderBy(desc(prescriptions.prescribedAt))
        .limit(8),
      db
        .select({ id: patientConditions.id, condition: patientConditions.condition, createdAt: patientConditions.createdAt })
        .from(patientConditions)
        .where(and(eq(patientConditions.patientId, patientId), isNull(patientConditions.deletedAt)))
        .orderBy(desc(patientConditions.createdAt))
        .limit(12),
      db
        .select({ id: patientAllergies.id, allergy: patientAllergies.allergy, createdAt: patientAllergies.createdAt })
        .from(patientAllergies)
        .where(and(eq(patientAllergies.patientId, patientId), isNull(patientAllergies.deletedAt)))
        .orderBy(desc(patientAllergies.createdAt))
        .limit(12),
      db
        .select({ id: appointments.id, scheduledAt: appointments.scheduledAt, status: appointments.status })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            eq(appointments.doctorId, doctorId),
            eq(appointments.patientId, patientId),
            isNull(appointments.deletedAt)
          )
        )
        .orderBy(desc(appointments.scheduledAt))
        .limit(4),
    ]);

  const facts: CopilotFact[] = [];

  for (const row of visitRows) {
    facts.push(
      makeFact({
        category: "visit",
        patientId,
        patientName,
        label: "Consultation note",
        detail: [text(row.reason, "Consultation"), text(row.notes)].filter(Boolean).join(". "),
        priority: "routine",
        timestamp: iso(row.createdAt),
        table: "visits",
        recordId: row.id,
        field: "notes",
      })
    );
  }

  for (const row of labRows) {
    const parsed = parseLabResultData(row.resultData, row.fileUrl);
    const flaggedValues = parsed.values
      .filter((value) => value.flag !== "normal")
      .slice(0, 3)
      .map((value) => `${value.name}: ${value.value}${value.unit ? ` ${value.unit}` : ""} (${value.flag})`)
      .join("; ");

    facts.push(
      makeFact({
        category: "lab",
        patientId,
        patientName,
        label: `Lab result · ${text(row.testName, "test")}`,
        detail: [clip(parsed.summary, 200), flaggedValues, `status ${parsed.status}`].filter(Boolean).join(". "),
        priority: labPriority(parsed.flag),
        timestamp: iso(row.createdAt),
        table: "lab_results",
        recordId: row.id,
        field: "resultData",
      })
    );
  }

  for (const row of vitalRows) {
    facts.push(
      makeFact({
        category: "vitals",
        patientId,
        patientName,
        label: "Vital signs",
        detail: [
          row.bloodPressure ? `BP ${row.bloodPressure}` : null,
          row.heartRate ? `HR ${row.heartRate}` : null,
          row.oxygenSaturation ? `SpO2 ${row.oxygenSaturation}` : null,
          row.painScore !== null ? `pain ${row.painScore}/10` : null,
          row.notes ? text(row.notes) : null,
        ]
          .filter(Boolean)
          .join(" · "),
        priority: vitalPriority(row),
        timestamp: iso(row.recordedAt),
        table: "vitals",
        recordId: row.id,
        field: "recordedAt",
      })
    );
  }

  for (const row of prescriptionRows) {
    const priorityLabel = text(row.priority, "routine");
    const urgent = Boolean(row.isEmergency) || ["urgent", "critical", "stat"].includes(priorityLabel.toLowerCase());
    facts.push(
      makeFact({
        category: "prescription",
        patientId,
        patientName,
        label: `Prescription · ${text(row.medication, "medication")}`,
        detail: [
          [text(row.strength), text(row.dosage), text(row.frequency)].filter(Boolean).join(" · "),
          `status ${text(row.status, "unknown")}`,
          `refills remaining ${row.refillsRemaining ?? 0}`,
        ]
          .filter(Boolean)
          .join(" · "),
        priority: urgent ? "urgent" : "routine",
        timestamp: iso(row.prescribedAt),
        table: "prescriptions",
        recordId: row.id,
        field: "status",
      })
    );
  }

  for (const row of conditionRows) {
    facts.push(
      makeFact({
        category: "condition",
        patientId,
        patientName,
        label: "Recorded condition",
        detail: text(row.condition, "Condition on file"),
        priority: "routine",
        timestamp: iso(row.createdAt),
        table: "patient_conditions",
        recordId: row.id,
        field: "condition",
      })
    );
  }

  for (const row of allergyRows) {
    facts.push(
      makeFact({
        category: "allergy",
        patientId,
        patientName,
        label: "Recorded allergy",
        detail: text(row.allergy, "Allergy on file"),
        priority: "urgent",
        timestamp: iso(row.createdAt),
        table: "patient_allergies",
        recordId: row.id,
        field: "allergy",
      })
    );
  }

  for (const row of appointmentRows) {
    const active = ["checked-in", "in-progress"].includes(String(row.status || "").toLowerCase());
    facts.push(
      makeFact({
        category: "appointment",
        patientId,
        patientName,
        label: "Appointment",
        detail: `status ${text(row.status, "scheduled")} · ${row.scheduledAt ? row.scheduledAt.toISOString().slice(0, 16).replace("T", " ") : "time not set"}`,
        priority: active ? "urgent" : "routine",
        timestamp: iso(row.scheduledAt),
        table: "appointments",
        recordId: row.id,
        field: "status",
      })
    );
  }

  const sortedFacts = sortFacts(facts);

  return {
    facts: sortedFacts,
    allowedPatientIds: [patientId],
    generatedAt: new Date().toISOString(),
    counts: countsFromFacts(sortedFacts),
  };
}

/**
 * Builds the narrowest safe context for a free-form question. Without a
 * patient focus it uses the doctor's active handoff scope. With a patient
 * focus it first verifies that the patient is assigned to this doctor through
 * a queue entry or a consultation, then builds the patient-level context.
 */
export async function buildQueryContext({
  doctorId,
  tenantId,
  patientId,
  queueId,
}: {
  doctorId: string;
  tenantId: string;
  patientId?: string;
  queueId?: string;
}): Promise<CopilotContext | null> {
  if (!patientId) {
    return buildHandoffContext({ doctorId, tenantId });
  }

  if (queueId) {
    return buildPatientContext({ doctorId, tenantId, patientId, queueId });
  }

  const [queueAssignment, visitAssignment] = await Promise.all([
    db
      .select({ id: queues.id })
      .from(queues)
      .where(
        and(
          eq(queues.tenantId, tenantId),
          eq(queues.patientId, patientId),
          eq(queues.assignedTo, doctorId),
          isNull(queues.deletedAt)
        )
      )
      .limit(1),
    db
      .select({ id: visits.id })
      .from(visits)
      .where(
        and(
          eq(visits.tenantId, tenantId),
          eq(visits.patientId, patientId),
          eq(visits.doctorId, doctorId),
          isNull(visits.deletedAt)
        )
      )
      .limit(1),
  ]);

  if (!queueAssignment[0] && !visitAssignment[0]) return null;

  return buildPatientContext({ doctorId, tenantId, patientId });
}
