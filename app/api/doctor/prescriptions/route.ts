import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { prescriptions, patients, users } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const status = searchParams.get("status") || "all";
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
    let whereConditions = [eq(prescriptions.doctorId, session.user.id)];

    if (status !== "all") {
      whereConditions.push(eq(prescriptions.status, status));
    }

    // Fetch prescriptions with patient details
    const prescriptionsData = await db
      .select({
        id: prescriptions.id,
        patientId: prescriptions.patientId,
        patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
        patientEmail: patients.email,
        patientPhone: patients.phone,
        medication: prescriptions.medication,
        genericName: prescriptions.genericName,
        strength: prescriptions.strength,
        dosage: prescriptions.dosage,
        frequency: prescriptions.frequency,
        duration: prescriptions.duration,
        quantity: prescriptions.quantity,
        refills: prescriptions.refills,
        refillsRemaining: prescriptions.refillsRemaining,
        instructions: prescriptions.instructions,
        indications: prescriptions.indications,
        status: prescriptions.status,
        prescribedBy: prescriptions.prescribedBy,
        prescribedAt: prescriptions.prescribedAt,
        filledAt: prescriptions.filledAt,
        expiresAt: prescriptions.expiresAt,
        pharmacy: prescriptions.pharmacy,
        notes: prescriptions.notes,
        interactions: prescriptions.interactions,
        sideEffects: prescriptions.sideEffects,
      })
      .from(prescriptions)
      .innerJoin(patients, eq(prescriptions.patientId, patients.id))
      .where(and(...whereConditions))
      .orderBy(desc(prescriptions.prescribedAt));

    // Filter by search term if provided
    let filteredPrescriptions = prescriptionsData;
    if (search) {
      filteredPrescriptions = prescriptionsData.filter(rx =>
        rx.patientName.toLowerCase().includes(search.toLowerCase()) ||
        rx.medication.toLowerCase().includes(search.toLowerCase())
      );
    }

    return NextResponse.json(filteredPrescriptions);

  } catch (error) {
    console.error("Doctor prescriptions API error:", error);
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
      medication,
      strength,
      dosage,
      frequency,
      duration,
      quantity,
      refills,
      instructions,
      indications,
      notes
    } = body;

    if (!slug || !patientId || !medication || !dosage || !frequency || !instructions) {
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

    // Create prescription
    const newPrescription = await db
      .insert(prescriptions)
      .values({
        patientId,
        doctorId: session.user.id,
        medication,
        strength,
        dosage,
        frequency,
        duration,
        quantity,
        refills: refills || 0,
        refillsRemaining: refills || 0,
        instructions,
        indications,
        status: "active",
        prescribedBy: doctorUser[0].fullName || doctorUser[0].email,
        prescribedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newPrescription[0]);

  } catch (error) {
    console.error("Create prescription API error:", error);
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

    // Update prescription
    const updateData: any = { updatedAt: new Date(), ...updates };

    const updatedPrescription = await db
      .update(prescriptions)
      .set(updateData)
      .where(and(eq(prescriptions.id, id), eq(prescriptions.doctorId, session.user.id)))
      .returning();

    if (!updatedPrescription.length) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    return NextResponse.json(updatedPrescription[0]);

  } catch (error) {
    console.error("Update prescription API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

