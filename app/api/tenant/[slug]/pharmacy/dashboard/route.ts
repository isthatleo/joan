import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;

    // Mock dashboard metrics
    const metrics = {
      totalMedications: 1245,
      lowStockItems: 32,
      pendingPrescriptions: 47,
      dispensedToday: 156,
      drugInteractionsCritical: 3,
      outOfStockItems: 8,
      targetedRevenue: 8750.50,
      stockAlerts: 14,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}

