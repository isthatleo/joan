// Mobile doctor app API
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Return doctor's daily briefing
    const briefing = {
      appointments: 8,
      queueWaiting: 4,
      criticalAlerts: 2,
      newResults: 3,
      prescriptionsPending: 5,
    };
    return NextResponse.json(briefing);
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// Quick notes endpoint
export async function POST(request: NextRequest) {
  try {
    const { patientId, note, timestamp } = await request.json();
    // Save quick note to DB
    return NextResponse.json({ success: true, id: "note-id" });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
