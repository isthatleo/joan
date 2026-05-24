import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { labOrders, labResults, notifications, patients, users } from "@/lib/db/schema";
import { parseLabResultData, serializeLabResultData } from "@/lib/doctor/lab-results";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = Number(request.nextUrl.searchParams.get("limit") || "100");

    const rows = await db
      .select({
        id: labResults.id,
        labOrderId: labOrders.id,
        patientName: sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`,
        testType: labOrders.testName,
        resultData: labResults.resultData,
        fileUrl: labResults.fileUrl,
        createdAt: labResults.createdAt,
      })
      .from(labResults)
      .innerJoin(labOrders, eq(labOrders.id, labResults.labOrderId))
      .innerJoin(patients, eq(patients.id, labOrders.patientId))
      .where(and(eq(labResults.tenantId, session.user.tenantId), isNull(labResults.deletedAt), isNull(labOrders.deletedAt)))
      .orderBy(desc(labResults.createdAt))
      .limit(limit);

    return NextResponse.json({
      results: rows.map((row) => {
        const parsed = parseLabResultData(row.resultData, row.fileUrl);
        return {
          id: row.id,
          labOrderId: row.labOrderId,
          patientName: row.patientName,
          testType: row.testType,
          resultData: row.resultData,
          fileUrl: parsed.fileUrl,
          status: parsed.status,
          createdAt: row.createdAt,
          notes: parsed.notes,
        };
      }),
    });
  } catch (error) {
    console.error("Failed to fetch lab results:", error);
    return NextResponse.json({ error: "Failed to fetch lab results" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { labOrderId, resultData, fileUrl } = await request.json();

    if (!labOrderId || !resultData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const order = await db
      .select({
        id: labOrders.id,
        tenantId: labOrders.tenantId,
        patientId: labOrders.patientId,
        doctorId: labOrders.doctorId,
        testName: labOrders.testName,
        patientName: patients.fullName,
      })
      .from(labOrders)
      .innerJoin(patients, eq(patients.id, labOrders.patientId))
      .where(and(eq(labOrders.id, String(labOrderId)), eq(labOrders.tenantId, session.user.tenantId), isNull(labOrders.deletedAt)))
      .limit(1);

    if (!order.length) {
      return NextResponse.json({ error: "Lab order not found" }, { status: 404 });
    }

    const parsed = parseLabResultData(resultData, fileUrl || null);
    const normalized = {
      ...parsed,
      status: "pending_review",
      publishedAt: new Date().toISOString(),
    };

    const [result] = await db
      .insert(labResults)
      .values({
        labOrderId: order[0].id,
        tenantId: order[0].tenantId,
        resultData: serializeLabResultData(normalized),
        fileUrl: fileUrl || null,
      })
      .returning();

    await db
      .update(labOrders)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(labOrders.id, order[0].id));

    if (order[0].doctorId) {
      await db.insert(notifications).values({
        tenantId: order[0].tenantId,
        userId: order[0].doctorId,
        type: "lab_result_ready",
        title: "Lab result ready",
        message: `${order[0].testName || "Lab results"} are available for ${order[0].patientName || "a patient"}.`,
        metadata: {
          labOrderId: order[0].id,
          labResultId: result.id,
          patientId: order[0].patientId,
        },
        read: false,
      });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to upload lab result:", error);
    return NextResponse.json({ error: "Failed to upload lab result" }, { status: 500 });
  }
}
