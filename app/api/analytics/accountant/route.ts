import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const accountantStats = {
      totalRevenu24h: 287450,
      totalBilledAmount: 452670,
      collectedAmount: 418920,
      outstandingAmount: 33750,
      collectionRate: 92.5,
      invoicesIssued: 342,
      invoicePending: 28,
      avgDaysOutstanding: 12,
    };

    const topClaims = [
      {
        id: "INS-001",
        hospital: "City Medical Center",
        amount: 45230,
        status: "approved",
        submittedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "INS-002",
        hospital: "County Hospital",
        amount: 28540,
        status: "pending",
        submittedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    return NextResponse.json({
      stats: accountantStats,
      topClaims,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching accountant analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

