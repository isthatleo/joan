import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;

    // Mock filling prescription
    const result = {
      id,
      status: "filled",
      filledAt: new Date().toISOString(),
      message: "Prescription filled successfully",
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error filling prescription:", error);
    return NextResponse.json({ error: "Failed to fill prescription" }, { status: 500 });
  }
}

