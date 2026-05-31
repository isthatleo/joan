import { NextRequest, NextResponse } from "next/server";
import { getReceptionPatientRegistrationPolicy, getTenantBySlug, registerReceptionPatient } from "@/lib/receptionist/data";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const policy = await getReceptionPatientRegistrationPolicy(tenant.id);
    return NextResponse.json(policy);
  } catch (error) {
    console.error("Failed to load patient registration policy:", error);
    return NextResponse.json({ error: "Failed to load patient registration policy" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const payload = await request.json();
    const result = await registerReceptionPatient(tenant.id, payload);

    return NextResponse.json({
      success: true,
      patient: result.patient,
      access: result.access,
      guardianLink: result.guardianLink,
      patientId: result.patient.id,
      message: "Patient registered successfully",
    });
  } catch (error: any) {
    console.error("Failed to register patient:", error);
    return NextResponse.json({ error: error?.message || "Failed to register patient" }, { status: 500 });
  }
}
