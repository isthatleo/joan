import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = resolvedParams;

    // Mock data - replace with actual database queries
    const waitingRoomStats = {
      totalPatients: 8,
      averageWaitTime: "12 min",
      longestWait: "28 min",
      roomsOccupied: 3,
      roomsAvailable: 12,
      nextPatientCall: "Sarah Johnson"
    };

    return NextResponse.json(waitingRoomStats);
  } catch (error) {
    console.error("Failed to fetch waiting room stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch waiting room stats" },
      { status: 500 }
    );
  }
}
