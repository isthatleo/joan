import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const nurseStats = {
      patientsAssigned: 18,
      vitalRecorded: 16,
      medicationsAdministered: 34,
      careTasksCompleted: 28,
      pendingTasks: 5,
      alertsRaised: 2,
    };

    const vitalsSummary = [
      {
        patientId: "1",
        patientName: "John Doe",
        bloodPressure: "120/80",
        heartRate: 72,
        temperature: 98.6,
        oxygenSaturation: 98,
        lastRecorded: new Date(Date.now() - 30 * 60000).toISOString(),
      },
      {
        patientId: "2",
        patientName: "Jane Smith",
        bloodPressure: "135/85",
        heartRate: 78,
        temperature: 98.4,
        oxygenSaturation: 97,
        lastRecorded: new Date(Date.now() - 45 * 60000).toISOString(),
      },
    ];

    return NextResponse.json({
      stats: nurseStats,
      vitalsSummary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching nurse analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

