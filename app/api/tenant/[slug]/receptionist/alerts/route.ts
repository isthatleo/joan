import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = resolvedParams;

    // Mock data - replace with actual database queries
    const alerts = [
      {
        id: "1",
        title: "High Patient Volume",
        message: "Current patient volume is 25% above normal. Consider activating overflow protocols.",
        type: "warning",
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
        priority: "medium"
      },
      {
        id: "2",
        title: "Emergency Room Backup",
        message: "Emergency department is experiencing delays. Triage patients accordingly.",
        type: "error",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        priority: "high"
      }
    ];

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Failed to fetch receptionist alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch receptionist alerts" },
      { status: 500 }
    );
  }
}
