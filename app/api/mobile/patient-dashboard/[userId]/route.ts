// Patient mobile app API
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const dashboard = {
      upcomingAppointments: 2,
      activePrescriptions: 3,
      labResultsPending: 1,
      billingDue: "$250",
      lastVisit: "2026-04-10",
    };
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
