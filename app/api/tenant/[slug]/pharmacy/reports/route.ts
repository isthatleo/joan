import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";

    // Mock reports
    const reports = [
      {
        id: "rep-001",
        title: "Daily Pharmacy Report - April 15, 2024",
        description: "Daily operations summary and performance metrics",
        type: "daily",
        status: "ready",
        generatedAt: new Date(Date.now() - 1 * 24 * 60 * 60000).toISOString(),
        dataPoints: 47,
        summary: {
          totalPrescriptions: 45,
          totalFilled: 42,
          totalRevenue: 6850.50,
          averageValue: 152.50,
        },
      },
      {
        id: "rep-002",
        title: "Weekly Pharmacy Report - Week of Apr 8-14, 2024",
        description: "Weekly performance and trend analysis",
        type: "weekly",
        status: "ready",
        generatedAt: new Date(Date.now() - 3 * 24 * 60 * 60000).toISOString(),
        dataPoints: 156,
        summary: {
          totalPrescriptions: 287,
          totalFilled: 278,
          totalRevenue: 45230.50,
          averageValue: 157.50,
        },
      },
      {
        id: "rep-003",
        title: "Monthly Pharmacy Report - March 2024",
        description: "Comprehensive monthly analysis and KPIs",
        type: "monthly",
        status: "ready",
        generatedAt: new Date(Date.now() - 15 * 24 * 60 * 60000).toISOString(),
        dataPoints: 456,
        summary: {
          totalPrescriptions: 892,
          totalFilled: 856,
          totalRevenue: 142000,
          averageValue: 165.50,
        },
      },
      {
        id: "rep-004",
        title: "Inventory Stock Report - April 2024",
        description: "Medication inventory levels and movement",
        type: "monthly",
        status: "pending",
        generatedAt: new Date(Date.now() - 2 * 60000).toISOString(),
        dataPoints: 234,
        summary: {
          totalPrescriptions: 0,
          totalFilled: 0,
          totalRevenue: 0,
          averageValue: 0,
        },
      },
    ];

    const filtered = type === "all" ? reports : reports.filter(r => r.type === type);
    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

