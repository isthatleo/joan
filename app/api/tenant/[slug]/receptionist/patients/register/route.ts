import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = resolvedParams;
    const patientData = await request.json();

    // Mock patient registration - replace with actual database operations
    console.log("Registering new patient:", patientData);

    // Generate mock patient ID
    const patientId = `patient_${Date.now()}`;

    // Mock response
    const newPatient = {
      id: patientId,
      ...patientData,
      medicalRecordNumber: `MRN${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      status: "active"
    };

    return NextResponse.json({
      success: true,
      patient: newPatient,
      message: "Patient registered successfully"
    });
  } catch (error) {
    console.error("Failed to register patient:", error);
    return NextResponse.json(
      { error: "Failed to register patient" },
      { status: 500 }
    );
  }
}
