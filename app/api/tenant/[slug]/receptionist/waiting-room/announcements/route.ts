import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = resolvedParams;

    // Mock data - replace with actual database queries
    const announcements = [
      {
        id: "1",
        message: "Please be patient, we are experiencing higher than normal wait times today.",
        type: "info",
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        active: true
      },
      {
        id: "2",
        message: "Free WiFi is available - ask at the front desk for the password.",
        type: "info",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        active: true
      }
    ];

    return NextResponse.json(announcements);
  } catch (error) {
    console.error("Failed to fetch waiting room announcements:", error);
    return NextResponse.json(
      { error: "Failed to fetch waiting room announcements" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = resolvedParams;
    const { message, type } = await request.json();

    // Mock announcement creation - replace with actual database operations
    const newAnnouncement = {
      id: `announcement_${Date.now()}`,
      message,
      type,
      timestamp: new Date().toISOString(),
      active: true
    };

    console.log("Created new announcement:", newAnnouncement);

    return NextResponse.json(newAnnouncement);
  } catch (error) {
    console.error("Failed to create announcement:", error);
    return NextResponse.json(
      { error: "Failed to create announcement" },
      { status: 500 }
    );
  }
}
