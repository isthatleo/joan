import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = resolvedParams;

    // Mock data - replace with actual database queries
    const queueStats = {
      totalWaiting: 8,
      averageWaitTime: "12 min",
      longestWait: "28 min",
      urgentCount: 2,
      completedToday: 42
    };

    return NextResponse.json(queueStats);
  } catch (error) {
    console.error("Failed to fetch queue stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch queue stats" },
      { status: 500 }
    );
  }
}
