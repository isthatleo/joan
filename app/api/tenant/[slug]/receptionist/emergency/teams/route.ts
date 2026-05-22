import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = resolvedParams;

    // Mock data - replace with actual database queries
    const emergencyTeams = [
      {
        id: "team_1",
        name: "Cardiac Response Team A",
        role: "Cardiac Emergency",
        status: "responding",
        location: "Room 203",
        lastActive: new Date(Date.now() - 1000 * 60 * 2).toISOString()
      },
      {
        id: "team_2",
        name: "Trauma Team Alpha",
        role: "Trauma Response",
        status: "available",
        location: "Emergency Department",
        lastActive: new Date(Date.now() - 1000 * 60 * 5).toISOString()
      },
      {
        id: "team_3",
        name: "Code Blue Team",
        role: "Cardiac Arrest Response",
        status: "available",
        location: "ICU Wing",
        lastActive: new Date(Date.now() - 1000 * 60 * 10).toISOString()
      },
      {
        id: "team_4",
        name: "Pediatric Emergency",
        role: "Pediatric Emergency",
        status: "busy",
        location: "Pediatric Ward",
        lastActive: new Date(Date.now() - 1000 * 60 * 1).toISOString()
      },
      {
        id: "team_5",
        name: "Respiratory Team",
        role: "Respiratory Emergency",
        status: "available",
        location: "Respiratory Unit",
        lastActive: new Date(Date.now() - 1000 * 60 * 15).toISOString()
      }
    ];

    return NextResponse.json(emergencyTeams);
  } catch (error) {
    console.error("Failed to fetch emergency teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch emergency teams" },
      { status: 500 }
    );
  }
}
