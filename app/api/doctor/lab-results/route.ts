import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { labOrders, labResults, patients } from "@/lib/db/schema";
import { resolveDoctorContext } from "@/lib/doctor/server";
import { parseLabResultData } from "@/lib/doctor/lab-results";

function deriveOverallFlag(values: ReturnType<typeof parseLabResultData>["values"]) {
  if (values.some((value) => value.flag === "critical")) return "critical";
  if (values.some((value) => value.flag === "high")) return "high";
  if (values.some((value) => value.flag === "low")) return "low";
  if (values.some((value) => value.flag === "abnormal")) return "abnormal";
  return "normal";
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
    const statusFilter = request.nextUrl.searchParams.get("status")?.trim() || "all";
    const flagFilter = request.nextUrl.searchParams.get("flag")?.trim() || "all";
    const orderId = request.nextUrl.searchParams.get("orderId")?.trim() || "";

    const conditions = [
      eq(labOrders.tenantId, doctor.tenantId),
      eq(labOrders.doctorId, doctor.id),
      isNull(labOrders.deletedAt),
      isNull(labResults.deletedAt),
      isNull(patients.deletedAt),
    ];

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
    if (orderId) {
      conditions.push(eq(labOrders.id, orderId));
    }

    const rows = await db
      .select({
        id: labResults.id,
        orderId: labOrders.id,
        patientId: patients.id,
        patientName: sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`,
        patientEmail: patients.email,
        patientPhone: patients.phone,
        globalPatientId: patients.globalPatientId,
        testName: labOrders.testName,
        testCode: labOrders.testCode,
        category: labOrders.category,
        priority: labOrders.priority,
        performedAt: labResults.createdAt,
        orderedAt: labOrders.orderedAt,
        resultData: labResults.resultData,
        fileUrl: labResults.fileUrl,
      })
      .from(labResults)
      .innerJoin(labOrders, eq(labOrders.id, labResults.labOrderId))
      .innerJoin(patients, eq(patients.id, labOrders.patientId))
      .where(and(...conditions))
      .orderBy(desc(labResults.createdAt));

    const results = rows
      .map((row) => {
        const parsed = parseLabResultData(row.resultData, row.fileUrl);
        const flag = deriveOverallFlag(parsed.values);
        return {
          id: row.id,
          orderId: row.orderId,
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
          flag,
          summary: parsed.summary,
          values: parsed.values,
          notes: parsed.notes,
          attachments: parsed.attachments,
          fileUrl: parsed.fileUrl,
          performedAt: row.performedAt,
          orderedAt: row.orderedAt,
          acceptedAt: parsed.acceptedAt,
          acceptedByDoctorName: parsed.acceptedByDoctorName,
          requestedRepeatAt: parsed.requestedRepeatAt,
          followUpOrderId: parsed.followUpOrderId,
        };
      })
      .filter((row) => (statusFilter === "all" ? true : row.status === statusFilter))
      .filter((row) => (flagFilter === "all" ? true : row.flag === flagFilter));

    const stats = {
      total: results.length,
      pendingReview: results.filter((row) => row.status === "pending_review").length,
      accepted: results.filter((row) => row.status === "accepted").length,
      critical: results.filter((row) => row.flag === "critical").length,
      abnormal: results.filter((row) => row.flag !== "normal").length,
    };

    return NextResponse.json({ results, stats });
  } catch (error) {
    console.error("Doctor lab results API error:", error);
    return NextResponse.json({ error: "Failed to fetch lab results" }, { status: 500 });
  }
}
