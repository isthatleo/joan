import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;

    // Mock recent activities
    const activities = [
      {
        id: "act-001",
        type: "prescription",
        title: "Prescription Received",
        description: "New prescription from Dr. Smith for patient John Doe",
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      },
      {
        id: "act-002",
        type: "dispensing",
        title: "Prescription Filled",
        description: "Amoxicillin 500mg dispensed to Jane Smith",
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      },
      {
        id: "act-003",
        type: "inventory",
        title: "Stock Updated",
        description: "Metformin 1000mg stock increased by 500 units",
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      },
      {
        id: "act-004",
        type: "alert",
        title: "Low Stock Alert",
        description: "Ibuprofen 400mg stock level below minimum threshold",
        timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      },
      {
        id: "act-005",
        type: "prescription",
        title: "Prescription Cancelled",
        description: "Prescription cancelled by Dr. Johnson",
        timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      },
    ];

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}

