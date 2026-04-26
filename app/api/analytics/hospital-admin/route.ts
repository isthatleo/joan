import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const hospitalAdminStats = {
      totalPatients: 5234,
      activePatients: 3428,
      totalStaff: 287,
      activeAppointments: 45,
      completedAppointments: 892,
      revenueThisMonth: 287450,
      bedOccupancy: 78.5,
      avgPatientStay: 4.2,
    };

    const recentPatients = [
      {
        id: "P-001",
        name: "John Smith",
        admissionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        department: "Cardiology",
        status: "admitted",
      },
      {
        id: "P-002",
        name: "Jane Doe",
        admissionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        department: "Orthopedics",
        status: "admitted",
      },
    ];

    return NextResponse.json({
      stats: hospitalAdminStats,
      recentPatients,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching hospital admin analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

