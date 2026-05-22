import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = resolvedParams;

    // Mock data - replace with actual database queries
    const queueItems = [
      {
        id: "1",
        patientName: "Sarah Johnson",
        checkInTime: "09:15 AM",
        estimatedWaitTime: "15 min",
        actualWaitTime: "8 min",
        status: "waiting",
        appointmentType: "General Checkup",
        doctorName: "Dr. Smith",
        department: "General Medicine",
        priority: "normal",
        position: 1
      },
      {
        id: "2",
        patientName: "Michael Chen",
        checkInTime: "09:20 AM",
        estimatedWaitTime: "20 min",
        actualWaitTime: "12 min",
        status: "waiting",
        appointmentType: "Follow-up",
        doctorName: "Dr. Davis",
        department: "Cardiology",
        priority: "high",
        position: 2
      },
      {
        id: "3",
        patientName: "Robert Wilson",
        checkInTime: "09:25 AM",
        estimatedWaitTime: "25 min",
        actualWaitTime: "15 min",
        status: "waiting",
        appointmentType: "Consultation",
        doctorName: "Dr. Wilson",
        department: "Neurology",
        priority: "urgent",
        position: 3
      },
      {
        id: "4",
        patientName: "Emily Rodriguez",
        checkInTime: "09:30 AM",
        estimatedWaitTime: "30 min",
        actualWaitTime: "18 min",
        status: "with-doctor",
        appointmentType: "Physical Exam",
        doctorName: "Dr. Taylor",
        department: "General Medicine",
        priority: "normal",
        position: 4
      },
      {
        id: "5",
        patientName: "James Brown",
        checkInTime: "09:35 AM",
        estimatedWaitTime: "35 min",
        actualWaitTime: "22 min",
        status: "waiting",
        appointmentType: "Vaccination",
        doctorName: "Dr. Martinez",
        department: "Pediatrics",
        priority: "low",
        position: 5
      }
    ];

    return NextResponse.json(queueItems);
  } catch (error) {
    console.error("Failed to fetch receptionist queue:", error);
    return NextResponse.json(
      { error: "Failed to fetch receptionist queue" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = resolvedParams;
    const { patientId, status } = await request.json();

    // Mock update - replace with actual database update
    console.log(`Updating patient ${patientId} status to ${status}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update queue status:", error);
    return NextResponse.json(
      { error: "Failed to update queue status" },
      { status: 500 }
    );
  }
}
