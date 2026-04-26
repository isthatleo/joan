import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const labStats = {
      totalOrdersToday: 45,
      completedToday: 38,
      pendingAnalysis: 7,
      averageTurnaroundTime: "4.2 hours",
      qualityScore: 98.5,
      equipmentStatus: "all_operational",
    };

    const recentTests = [
      {
        orderId: "LAB-001",
        patientName: "John Doe",
        testType: "Complete Blood Count",
        status: "completed",
        resultTime: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
      },
      {
        orderId: "LAB-002",
        patientName: "Jane Smith",
        testType: "Biochemistry Panel",
        status: "in_progress",
        resultTime: null,
      },
      {
        orderId: "LAB-003",
        patientName: "Bob Johnson",
        testType: "Blood Glucose",
        status: "pending",
        resultTime: null,
      },
    ];

    return NextResponse.json({
      stats: labStats,
      recentTests,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching lab analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

