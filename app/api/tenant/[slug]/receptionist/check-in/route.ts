import { NextRequest, NextResponse } from "next/server";
import { checkInReceptionPatient, getTenantBySlug } from "@/lib/receptionist/data";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { patientId, appointmentId, doctorId, paymentMethod, insuranceProvider, insurancePolicyNumber, saveAsDefault, recordedBy } = await request.json();
    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
    }

    const result = await checkInReceptionPatient(tenant.id, patientId, appointmentId, {
      doctorId: doctorId || null,
      paymentMethod: paymentMethod || null,
      insuranceProvider: insuranceProvider || null,
      insurancePolicyNumber: insurancePolicyNumber || null,
      saveAsDefault: Boolean(saveAsDefault),
      recordedBy: recordedBy || null,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to check in patient:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check in patient" },
      { status: 500 },
    );
  }
}
