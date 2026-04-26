import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const receptionistStats = {
      appointmentsToday: 34,
      checkInsCompleted: 28,
      waitingPatients: 6,
      noShows: 0,
      averageWaitTime: 12, // minutes
      satisfactionRating: 4.6,
      emergencyAlerts: 0,
    };

    const urgentTasks = [
      {
        id: "1",
        priority: "high",
        task: "Patient check-in: John Doe",
        time: "2:30 PM",
        status: "pending",
      },
      {
        id: "2",
        priority: "medium",
        task: "Confirm appointment: Jane Smith",
        time: "2:45 PM",
        status: "pending",
      },
      {
        id: "3",
        priority: "low",
        task: "Process new patient registration",
        time: "3:00 PM",
        status: "pending",
      },
    ];

    const waitingRoom = [
      {
        patientName: "John Smith",
        appointmentTime: "2:15 PM",
        waitMinutes: 5,
        doctorName: "Dr. Sarah",
        status: "in_queue",
      },
      {
        patientName: "Jane Doe",
        appointmentTime: "2:30 PM",
        waitMinutes: 0,
        doctorName: "Dr. Michael",
        status: "next",
      },
    ];

    return NextResponse.json({
      stats: receptionistStats,
      urgentTasks,
      waitingRoom,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching receptionist data:", error);
    return NextResponse.json(
      { error: "Failed to fetch receptionist data" },
      { status: 500 }
    );
  }
}

