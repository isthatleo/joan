import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string; patientId: string }> }) {
  try {
    const { slug, patientId } = resolvedParams;

    // Mock patient calling - replace with actual notification system
    console.log(`Calling patient ${patientId} in waiting room`);

    // Mock response
    return NextResponse.json({
      success: true,
      message: "Patient called successfully",
      patientId
    });
  } catch (error) {
    console.error("Failed to call patient:", error);
    return NextResponse.json(
      { error: "Failed to call patient" },
      { status: 500 }
    );
  }
}
