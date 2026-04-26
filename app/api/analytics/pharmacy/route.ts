import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const pharmacyStats = {
      prescriptionsReceived: 52,
      prescriptionsDispensed: 48,
      stockLevels: 94, // percentage
      lowStockAlerts: 3,
      drugInteractionWarnings: 1,
      averageDispenseTime: "8.5 minutes",
      satisfactionRating: 4.7,
    };

    const recentDispensing = [
      {
        id: "RX-001",
        patientName: "John Smith",
        medication: "Amoxicillin 500mg",
        quantity: 21,
        status: "dispensed",
        time: new Date(Date.now() - 15 * 60000).toISOString(),
      },
      {
        id: "RX-002",
        patientName: "Jane Doe",
        medication: "Metformin 1000mg",
        quantity: 60,
        status: "pending_pickup",
        time: new Date(Date.now() - 45 * 60000).toISOString(),
      },
      {
        id: "RX-003",
        patientName: "Bob Johnson",
        medication: "Lisinopril 10mg",
        quantity: 30,
        status: "awaiting_verification",
        time: new Date(Date.now() - 5 * 60000).toISOString(),
      },
    ];

    return NextResponse.json({
      stats: pharmacyStats,
      recentDispensing,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching pharmacy analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

