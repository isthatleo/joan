import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import {
  appointments,
  diagnoses,
  labOrders,
  labResults,
  patientAllergies,
  patientConditions,
  patients,
  prescriptions,
  vitals,
  visits,
} from "@/lib/db/schema";
import { db } from "@/lib/db";
import { summarizeLabResult, sortTimeline, type PatientHistoryTimelineItem } from "@/lib/doctor/patient-history";
import { resolveDoctorContext } from "@/lib/doctor/server";

export async function GET(request: NextRequest, context: RouteContext<"/api/doctor/patient-history/[id]">) {
  const doctorContext = await resolveDoctorContext(request.headers);
  if (!doctorContext.ok) {
    return NextResponse.json({ error: doctorContext.error }, { status: doctorContext.status });
  }

  const { doctor } = doctorContext;
  if (!doctor.tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const patient = await db.query.patients.findFirst({
      where: and(eq(patients.id, id), eq(patients.tenantId, doctor.tenantId), isNull(patients.deletedAt)),
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const [appointmentRows, visitRows, diagnosisRows, vitalRows, prescriptionRows, labOrderRows, labResultRows, conditionRows, allergyRows] = await Promise.all([
      db
        .select({
          id: appointments.id,
          scheduledAt: appointments.scheduledAt,
          status: appointments.status,
          createdAt: appointments.createdAt,
        })
        .from(appointments)
        .where(and(eq(appointments.patientId, id), eq(appointments.tenantId, doctor.tenantId), eq(appointments.doctorId, doctor.id), isNull(appointments.deletedAt)))
        .orderBy(desc(appointments.scheduledAt)),
      db
        .select({
          id: visits.id,
          appointmentId: visits.appointmentId,
          reason: visits.reason,
          notes: visits.notes,
          createdAt: visits.createdAt,
        })
        .from(visits)
        .where(and(eq(visits.patientId, id), eq(visits.tenantId, doctor.tenantId), eq(visits.doctorId, doctor.id), isNull(visits.deletedAt)))
        .orderBy(desc(visits.createdAt)),
      db
        .select({ id: diagnoses.id, visitId: diagnoses.visitId, code: diagnoses.code, description: diagnoses.description, createdAt: diagnoses.createdAt })
        .from(diagnoses)
        .innerJoin(visits, eq(visits.id, diagnoses.visitId))
        .where(and(eq(visits.patientId, id), eq(visits.tenantId, doctor.tenantId), eq(visits.doctorId, doctor.id), isNull(diagnoses.deletedAt), isNull(visits.deletedAt))),
      db
        .select({ id: vitals.id, visitId: vitals.visitId, temperature: vitals.temperature, bloodPressure: vitals.bloodPressure, heartRate: vitals.heartRate, createdAt: vitals.createdAt })
        .from(vitals)
        .innerJoin(visits, eq(visits.id, vitals.visitId))
        .where(and(eq(visits.patientId, id), eq(visits.tenantId, doctor.tenantId), eq(visits.doctorId, doctor.id), isNull(vitals.deletedAt), isNull(visits.deletedAt))),
      db
        .select({
          id: prescriptions.id,
          medication: prescriptions.medication,
          dosage: prescriptions.dosage,
          frequency: prescriptions.frequency,
          duration: prescriptions.duration,
          status: prescriptions.status,
          prescribedAt: prescriptions.prescribedAt,
          notes: prescriptions.notes,
          priority: prescriptions.priority,
        })
        .from(prescriptions)
        .where(and(eq(prescriptions.patientId, id), eq(prescriptions.tenantId, doctor.tenantId), eq(prescriptions.doctorId, doctor.id), isNull(prescriptions.deletedAt)))
        .orderBy(desc(prescriptions.prescribedAt)),
      db
        .select({
          id: labOrders.id,
          testName: labOrders.testName,
          testCode: labOrders.testCode,
          category: labOrders.category,
          priority: labOrders.priority,
          status: labOrders.status,
          orderedAt: labOrders.orderedAt,
          dueDate: labOrders.dueDate,
          notes: labOrders.notes,
          labLocation: labOrders.labLocation,
        })
        .from(labOrders)
        .where(and(eq(labOrders.patientId, id), eq(labOrders.tenantId, doctor.tenantId), eq(labOrders.doctorId, doctor.id), isNull(labOrders.deletedAt)))
        .orderBy(desc(labOrders.orderedAt)),
      db
        .select({
          id: labResults.id,
          labOrderId: labResults.labOrderId,
          resultData: labResults.resultData,
          fileUrl: labResults.fileUrl,
          createdAt: labResults.createdAt,
          testName: labOrders.testName,
          category: labOrders.category,
          status: labOrders.status,
        })
        .from(labResults)
        .innerJoin(labOrders, eq(labOrders.id, labResults.labOrderId))
        .where(and(eq(labOrders.patientId, id), eq(labOrders.tenantId, doctor.tenantId), eq(labOrders.doctorId, doctor.id), isNull(labResults.deletedAt), isNull(labOrders.deletedAt)))
        .orderBy(desc(labResults.createdAt)),
      db.select({ id: patientConditions.id, condition: patientConditions.condition, createdAt: patientConditions.createdAt }).from(patientConditions).where(and(eq(patientConditions.patientId, id), isNull(patientConditions.deletedAt))),
      db.select({ id: patientAllergies.id, allergy: patientAllergies.allergy, createdAt: patientAllergies.createdAt }).from(patientAllergies).where(and(eq(patientAllergies.patientId, id), isNull(patientAllergies.deletedAt))),
    ]);

    const diagnosisMap = new Map<string, string[]>();
    for (const row of diagnosisRows) {
      const current = diagnosisMap.get(row.visitId) || [];
      current.push([row.code, row.description].filter(Boolean).join(" - "));
      diagnosisMap.set(row.visitId, current);
    }

    const vitalMap = new Map<string, { temperature: string | null; bloodPressure: string | null; heartRate: string | null }[]>();
    for (const row of vitalRows) {
      const current = vitalMap.get(row.visitId) || [];
      current.push({ temperature: row.temperature, bloodPressure: row.bloodPressure, heartRate: row.heartRate });
      vitalMap.set(row.visitId, current);
    }

    const timeline: PatientHistoryTimelineItem[] = [];

    for (const row of visitRows) {
      const visitDiagnoses = diagnosisMap.get(row.id) || [];
      const visitVitals = vitalMap.get(row.id) || [];
      timeline.push({
        id: row.id,
        type: "visit",
        title: row.reason || "Consultation visit",
        description: row.notes || "Clinical visit recorded",
        date: row.createdAt?.toISOString() || new Date().toISOString(),
        status: "completed",
        provider: doctor.fullName || doctor.email,
        meta: {
          appointmentId: row.appointmentId,
          diagnoses: visitDiagnoses,
          vitals: visitVitals,
        },
      });
    }

    for (const row of appointmentRows) {
      timeline.push({
        id: row.id,
        type: "appointment",
        title: "Appointment",
        description: `Status: ${row.status || "scheduled"}`,
        date: row.scheduledAt?.toISOString() || row.createdAt?.toISOString() || new Date().toISOString(),
        status: row.status,
        provider: doctor.fullName || doctor.email,
      });
    }

    for (const row of prescriptionRows) {
      timeline.push({
        id: row.id,
        type: "prescription",
        title: row.medication || "Prescription",
        description: [row.dosage, row.frequency, row.duration].filter(Boolean).join(" · ") || "Medication order",
        date: row.prescribedAt?.toISOString() || new Date().toISOString(),
        status: row.status,
        category: row.priority,
        provider: doctor.fullName || doctor.email,
        meta: { notes: row.notes },
      });
    }

    for (const row of labOrderRows) {
      timeline.push({
        id: row.id,
        type: "lab_order",
        title: row.testName || "Lab order",
        description: [row.category, row.priority, row.labLocation].filter(Boolean).join(" · ") || "Lab request",
        date: row.orderedAt?.toISOString() || new Date().toISOString(),
        status: row.status,
        category: row.testCode,
        provider: doctor.fullName || doctor.email,
        meta: { dueDate: row.dueDate, notes: row.notes },
      });
    }

    for (const row of labResultRows) {
      const summary = summarizeLabResult(row.resultData, row.fileUrl);
      timeline.push({
        id: row.id,
        type: "lab_result",
        title: row.testName || "Lab result",
        description: summary.summary,
        date: row.createdAt?.toISOString() || new Date().toISOString(),
        status: summary.parsed.status,
        category: summary.flag,
        provider: doctor.fullName || doctor.email,
        meta: {
          attachment: row.fileUrl,
          values: summary.parsed.values,
          notes: summary.parsed.notes,
        },
      });
    }

    for (const row of conditionRows) {
      timeline.push({
        id: row.id,
        type: "condition",
        title: "Chronic / recorded condition",
        description: row.condition,
        date: row.createdAt?.toISOString() || new Date().toISOString(),
        status: "recorded",
      });
    }

    for (const row of allergyRows) {
      timeline.push({
        id: row.id,
        type: "allergy",
        title: "Allergy note",
        description: row.allergy,
        date: row.createdAt?.toISOString() || new Date().toISOString(),
        status: "recorded",
      });
    }

    const orderedTimeline = sortTimeline(timeline);
    const summary = {
      totalVisits: visitRows.length,
      totalAppointments: appointmentRows.length,
      totalPrescriptions: prescriptionRows.length,
      totalLabOrders: labOrderRows.length,
      totalLabResults: labResultRows.length,
      activePrescriptions: prescriptionRows.filter((row) => row.status === "active").length,
      pendingLabOrders: labOrderRows.filter((row) => row.status !== "completed").length,
      conditions: conditionRows.length,
      allergies: allergyRows.length,
      latestActivityAt: orderedTimeline[0]?.date || null,
    };

    const normalizedLabResults = labResultRows.map((row) => {
      const summary = summarizeLabResult(row.resultData, row.fileUrl);
      return {
        id: row.id,
        labOrderId: row.labOrderId,
        createdAt: row.createdAt,
        testName: row.testName,
        category: row.category,
        status: summary.parsed.status,
        fileUrl: row.fileUrl,
        parsed: summary.parsed,
        summary: summary.summary,
        flag: summary.flag,
      };
    });

    return NextResponse.json({
      patient: {
        id: patient.id,
        fullName: `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || patient.fullName || "Patient",
        firstName: patient.firstName,
        lastName: patient.lastName,
        mrn: patient.mrn,
        email: patient.email,
        phone: patient.phone,
        address: patient.address,
        dob: patient.dob,
        gender: patient.gender,
        status: patient.status,
        globalPatientId: patient.globalPatientId,
      },
      summary,
      timeline: orderedTimeline,
      diagnoses: diagnosisRows,
      vitals: vitalRows,
      prescriptions: prescriptionRows,
      labOrders: labOrderRows,
      labResults: normalizedLabResults,
      conditions: conditionRows,
      allergies: allergyRows,
    });
  } catch (error) {
    console.error("Doctor patient history detail API error:", error);
    return NextResponse.json({ error: "Failed to load patient history" }, { status: 500 });
  }
}
