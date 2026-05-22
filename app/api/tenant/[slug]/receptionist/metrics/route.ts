import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = resolvedParams;

    // Mock data - replace with actual database queries
    const receptionistMetrics = {
      totalPatientsToday: 45,
      checkedInPatients: 32,
      waitingPatients: 8,
      completedAppointments: 28,
      upcomingAppointments: 17,
      averageWaitTime: "12 min",
      emergencyAlerts: 2,
      messagesUnread: 5,
      queueLength: 8,
      registrationToday: 7,
    };

    return NextResponse.json(receptionistMetrics);
  } catch (error) {
    console.error("Failed to fetch receptionist metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch receptionist metrics" },
      { status: 500 }
    );
  }
}
