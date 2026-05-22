import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { labOrders, patients, users } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const status = searchParams.get("status") || "all";
    const category = searchParams.get("category") || "all";
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
    let whereConditions = [eq(labOrders.doctorId, session.user.id)];

    if (status !== "all") {
      whereConditions.push(eq(labOrders.status, status));
    }

    if (category !== "all") {
      whereConditions.push(eq(labOrders.category, category));
    }

    // Fetch lab orders with patient details
    const labOrdersData = await db
      .select({
        id: labOrders.id,
        patientId: labOrders.patientId,
        patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
        patientEmail: patients.email,
        patientPhone: patients.phone,
        testName: labOrders.testName,
        testCode: labOrders.testCode,
        category: labOrders.category,
        priority: labOrders.priority,
        status: labOrders.status,
        orderedBy: labOrders.orderedBy,
        orderedAt: labOrders.orderedAt,
        collectedAt: labOrders.collectedAt,
        completedAt: labOrders.completedAt,
        results: labOrders.results,
        notes: labOrders.notes,
        dueDate: labOrders.dueDate,
        labLocation: labOrders.labLocation,
      })
      .from(labOrders)
      .innerJoin(patients, eq(labOrders.patientId, patients.id))
      .where(and(...whereConditions))
      .orderBy(desc(labOrders.orderedAt));

    // Filter by search term if provided
    let filteredOrders = labOrdersData;
    if (search) {
      filteredOrders = labOrdersData.filter(order =>
        order.patientName.toLowerCase().includes(search.toLowerCase()) ||
        order.testName.toLowerCase().includes(search.toLowerCase()) ||
        order.testCode.toLowerCase().includes(search.toLowerCase())
      );
    }

    return NextResponse.json(filteredOrders);

  } catch (error) {
    console.error("Doctor lab orders API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      slug,
      patientId,
      testName,
      testCode,
      category,
      priority,
      notes,
      dueDate,
      labLocation
    } = body;

    if (!slug || !patientId || !testName || !testCode || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify doctor role
    const doctorUser = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.user.id), eq(users.role, "doctor")))
      .limit(1);

    if (!doctorUser.length) {
      return NextResponse.json({ error: "Doctor access required" }, { status: 403 });
    }

    // Verify patient exists
    const patient = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient.length) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Create lab order
    const newLabOrder = await db
      .insert(labOrders)
      .values({
        patientId,
        doctorId: session.user.id,
        testName,
        testCode,
        category,
        priority: priority || "routine",
        status: "ordered",
        orderedBy: doctorUser[0].fullName || doctorUser[0].email,
        orderedAt: new Date(),
        notes,
        dueDate: dueDate ? new Date(dueDate) : null,
        labLocation: labLocation || "Main Lab",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newLabOrder[0]);

  } catch (error) {
    console.error("Create lab order API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, updates, slug } = body;

    if (!id || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify doctor role
    const doctorUser = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.user.id), eq(users.role, "doctor")))
      .limit(1);

    if (!doctorUser.length) {
      return NextResponse.json({ error: "Doctor access required" }, { status: 403 });
    }

    // Update lab order
    const updateData: any = { updatedAt: new Date(), ...updates };

    const updatedOrder = await db
      .update(labOrders)
      .set(updateData)
      .where(and(eq(labOrders.id, id), eq(labOrders.doctorId, session.user.id)))
      .returning();

    if (!updatedOrder.length) {
      return NextResponse.json({ error: "Lab order not found" }, { status: 404 });
    }

    return NextResponse.json(updatedOrder[0]);

  } catch (error) {
    console.error("Update lab order API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

