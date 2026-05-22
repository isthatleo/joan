import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string; teamId: string }> }) {
  try {
    const { slug, teamId } = resolvedParams;
    const { alertId } = await request.json();

    // Mock team calling - replace with actual notification system
    console.log(`Calling emergency team ${teamId} for alert ${alertId}`);

    // Mock response
    return NextResponse.json({
      success: true,
      message: "Emergency team called successfully",
      teamId,
      alertId
    });
  } catch (error) {
    console.error("Failed to call emergency team:", error);
    return NextResponse.json(
      { error: "Failed to call emergency team" },
      { status: 500 }
    );
  }
}
