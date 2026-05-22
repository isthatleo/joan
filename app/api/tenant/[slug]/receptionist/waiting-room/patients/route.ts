import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = resolvedParams;

    // Mock data - replace with actual database queries
    const waitingRoomPatients = [
      {
        id: "1",
        patientName: "Sarah Johnson",
        checkInTime: "09:15 AM",
        estimatedWaitTime: "15 min",
        actualWaitTime: "8 min",
        appointmentType: "General Checkup",
        doctorName: "Dr. Smith",
        status: "waiting",
        priority: "normal",
        position: 1
      },
      {
        id: "2",
        patientName: "Michael Chen",
        checkInTime: "09:20 AM",
        estimatedWaitTime: "20 min",
        actualWaitTime: "12 min",
        appointmentType: "Cardiac Consultation",
        doctorName: "Dr. Davis",
        status: "waiting",
        priority: "high",
        position: 2
      },
      {
        id: "3",
        patientName: "Robert Wilson",
        checkInTime: "09:25 AM",
        estimatedWaitTime: "25 min",
        actualWaitTime: "15 min",
        appointmentType: "Neurology Consult",
        doctorName: "Dr. Wilson",
        status: "waiting",
        priority: "urgent",
        position: 3
      },
      {
        id: "4",
        patientName: "Emily Rodriguez",
        checkInTime: "09:30 AM",
        estimatedWaitTime: "30 min",
        actualWaitTime: "18 min",
        appointmentType: "Physical Exam",
        doctorName: "Dr. Taylor",
        status: "with-doctor",
        priority: "normal",
        position: 4,
        roomNumber: "101"
      },
      {
        id: "5",
        patientName: "James Brown",
        checkInTime: "09:35 AM",
        estimatedWaitTime: "35 min",
        actualWaitTime: "22 min",
        appointmentType: "Pediatric Checkup",
        doctorName: "Dr. Martinez",
        status: "waiting",
        priority: "low",
        position: 5
      }
    ];

    return NextResponse.json(waitingRoomPatients);
  } catch (error) {
    console.error("Failed to fetch waiting room patients:", error);
    return NextResponse.json(
      { error: "Failed to fetch waiting room patients" },
      { status: 500 }
    );
  }
}
