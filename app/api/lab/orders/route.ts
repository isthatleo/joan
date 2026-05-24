import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { labOrders, patients, users } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get("status")?.trim() || "";
    const limit = Number(request.nextUrl.searchParams.get("limit") || "100");
    const conditions = [eq(labOrders.tenantId, session.user.tenantId), isNull(labOrders.deletedAt)];
    if (status) conditions.push(eq(labOrders.status, status));

    const orders = await db
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
        results: labOrders.results,
        notes: labOrders.notes,
      })
      .from(labOrders)
      .innerJoin(patients, eq(patients.id, labOrders.patientId))
      .leftJoin(users, eq(users.id, labOrders.doctorId))
      .where(and(...conditions))
      .orderBy(desc(labOrders.orderedAt))
      .limit(limit);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Failed to fetch lab orders:", error);
    return NextResponse.json({ error: "Failed to fetch lab orders" }, { status: 500 });
  }
}
