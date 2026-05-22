import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;

    // Mock alerts
    const alerts = [
      {
        id: "alert-001",
        type: "warning",
        title: "Low Stock Alert",
        message: "Ibuprofen 400mg inventory below minimum threshold (45 units remaining)",
      },
      {
        id: "alert-002",
        type: "error",
        title: "Critical Stock Level",
        message: "Lisinopril 10mg is out of stock. Orders are pending.",
      },
      {
        id: "alert-003",
        type: "info",
        title: "Drug Interaction Flagged",
        message: "3 prescriptions have potential drug interactions requiring review",
      },
    ];

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

