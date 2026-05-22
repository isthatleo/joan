import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const resolvedParams = await params;
    const { slug } = resolvedParams;

    // Mock data - replace with actual database queries
    const upcomingAppointments = [
      {
        id: "1",
        patientName: "Sarah Johnson",
        time: "09:30 AM",
        type: "General Checkup",
        status: "scheduled",
        doctor: "Dr. Smith"
      },
      {
        id: "2",
        patientName: "Michael Chen",
        time: "10:00 AM",
        type: "Follow-up",
        status: "checked-in",
        doctor: "Dr. Davis"
      },
      {
        id: "3",
        patientName: "Emily Rodriguez",
        time: "10:30 AM",
        type: "Consultation",
        status: "scheduled",
        doctor: "Dr. Wilson"
      },
      {
        id: "4",
        patientName: "James Brown",
        time: "11:00 AM",
        type: "Physical Exam",
        status: "scheduled",
        doctor: "Dr. Taylor"
      },
      {
        id: "5",
        patientName: "Lisa Anderson",
        time: "11:30 AM",
        type: "Vaccination",
        status: "scheduled",
        doctor: "Dr. Martinez"
      }
    ];

    return NextResponse.json(upcomingAppointments);
  } catch (error) {
    console.error("Failed to fetch receptionist appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch receptionist appointments" },
      { status: 500 }
    );
  }
}
