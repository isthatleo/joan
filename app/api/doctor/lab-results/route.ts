import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { labResults, patients, users } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const status = searchParams.get("status") || "all";
    const flag = searchParams.get("flag") || "all";
    const search = searchParams.get("search") || "";

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Get doctor's user record to verify role
    const doctorUser = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.user.id), eq(users.role, "doctor")))
      .limit(1);

    if (!doctorUser.length) {
      return NextResponse.json({ error: "Doctor access required" }, { status: 403 });
    }

    // Build where conditions
    let whereConditions = [eq(labResults.doctorId, session.user.id)];

    if (status !== "all") {
      whereConditions.push(eq(labResults.status, status));
    }

    if (flag !== "all") {
      whereConditions.push(eq(labResults.flag, flag));
    }

    // Fetch lab results with patient details
    const labResultsData = await db
      .select({
        id: labResults.id,
        orderId: labResults.orderId,
        patientId: labResults.patientId,
        patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
        patientEmail: patients.email,
        patientPhone: patients.phone,
        testName: labResults.testName,
        testCode: labResults.testCode,
        category: labResults.category,
        result: labResults.result,
        unit: labResults.unit,
        referenceRange: labResults.referenceRange,
        flag: labResults.flag,
        status: labResults.status,
        performedBy: labResults.performedBy,
        verifiedBy: labResults.verifiedBy,
        performedAt: labResults.performedAt,
        verifiedAt: labResults.verifiedAt,
        notes: labResults.notes,
        attachments: labResults.attachments,
      })
      .from(labResults)
      .innerJoin(patients, eq(labResults.patientId, patients.id))
      .where(and(...whereConditions))
      .orderBy(desc(labResults.performedAt));

    // Filter by search term if provided
    let filteredResults = labResultsData;
    if (search) {
      filteredResults = labResultsData.filter(result =>
        result.patientName.toLowerCase().includes(search.toLowerCase()) ||
        result.testName.toLowerCase().includes(search.toLowerCase()) ||
        result.testCode.toLowerCase().includes(search.toLowerCase())
      );
    }

    return NextResponse.json(filteredResults);

  } catch (error) {
    console.error("Doctor lab results API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

