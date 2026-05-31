import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { prescriptions, prescriptionItems, visits } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireTenantUser } from "@/lib/api/route-guards";

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantUser(request, ["doctor", "pharmacist", "hospital_admin", "patient", "guardian"]);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const visitId = searchParams.get("visitId");

    if (!visitId) {
      return NextResponse.json({ error: "Visit ID required" }, { status: 400 });
    }

    const prescriptionList = await db.query.prescriptions.findMany({
      where: eq(prescriptions.visitId, visitId),
      with: {
        prescriptionItems: true,
      },
    });

    return NextResponse.json(prescriptionList);
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json({ error: "Failed to fetch prescriptions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantUser(request, ["doctor"]);
    if (!access.ok) return access.response;

    const data = await request.json();
    const { visitId, doctorId, items } = data;

    if (!visitId || !doctorId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (doctorId !== access.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const visit = await db.query.visits.findFirst({
      where: eq(visits.id, visitId),
      columns: { id: true, tenantId: true, patientId: true },
    });
    if (!visit || visit.tenantId !== access.user.tenantId) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const [prescription] = await db.insert(prescriptions).values({
      tenantId: access.user.tenantId,
      visitId,
      doctorId,
      patientId: visit.patientId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    for (const item of items) {
      await db.insert(prescriptionItems).values({
        prescriptionId: prescription.id,
        drugName: item.drugName,
        dosage: item.dosage,
        duration: item.duration,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const completePrescription = await db.query.prescriptions.findFirst({
      where: eq(prescriptions.id, prescription.id),
      with: {
        prescriptionItems: true,
      },
    });

    return NextResponse.json(completePrescription, { status: 201 });
  } catch (error) {
    console.error("Error creating prescription:", error);
    return NextResponse.json({ error: "Failed to create prescription" }, { status: 500 });
  }
}

