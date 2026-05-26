import { NextRequest, NextResponse } from "next/server";
import { getReceptionAppointments, getReceptionPatientProfile, getTenantBySlug } from "@/lib/receptionist/data";
import { getPatientPaymentWorkspace } from "@/lib/receptionist/payment";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; patientId: string }> },
) {
  try {
    const { slug, patientId } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const [appointmentsResult, profileResult, paymentResult] = await Promise.allSettled([
      getReceptionAppointments(tenant.id, { patientId }),
      getReceptionPatientProfile(tenant.id, patientId),
      getPatientPaymentWorkspace(tenant.id, patientId),
    ]);

    const appointments = appointmentsResult.status === "fulfilled" ? appointmentsResult.value : [];
    const patientProfile = profileResult.status === "fulfilled" ? profileResult.value : null;
    const paymentWorkspace = paymentResult.status === "fulfilled" ? paymentResult.value : null;

    if (!patientProfile) {
      return NextResponse.json({
        error: "Patient profile not found",
        appointments,
        patient: null,
        paymentWorkspace,
      }, { status: 404 });
    }

    return NextResponse.json({
      appointments,
      patient: patientProfile,
      paymentWorkspace,
    });
  } catch (error) {
    console.error("Failed to fetch patient appointments:", error);
    return NextResponse.json({ error: "Failed to fetch patient appointments" }, { status: 500 });
  }
}
