import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string; patientId: string }> }) {
  try {
    const { slug, patientId } = resolvedParams;

    // Mock data - replace with actual database queries
    const mockAppointments = [
      {
        id: "1",
        patientId: "1",
        doctorId: "doc1",
        doctorName: "Dr. Sarah Smith",
        department: "General Medicine",
        scheduledAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(), // 30 minutes from now
        type: "General Checkup",
        status: "scheduled",
        notes: "Annual physical examination"
      },
      {
        id: "2",
        patientId: "1",
        doctorId: "doc2",
        doctorName: "Dr. Michael Davis",
        department: "Cardiology",
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // Tomorrow
        type: "Follow-up",
        status: "scheduled",
        notes: "Post-treatment check"
      }
    ];

    // Filter appointments for the specific patient
    const patientAppointments = mockAppointments.filter(apt => apt.patientId === patientId);

    return NextResponse.json(patientAppointments);
  } catch (error) {
    console.error("Failed to fetch patient appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient appointments" },
      { status: 500 }
    );
  }
}
