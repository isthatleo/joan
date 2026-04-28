import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface DoctorStats {
  totalPatients: number;
  appointmentsToday: number;
  pendingOrders: number;
  completedToday: number;
  averageConsultationTime: number;
  patientSatisfaction: number;
}

export async function GET(request: NextRequest) {
  try {
    const doctorStats: DoctorStats = {
      totalPatients: 287,
      appointmentsToday: 12,
      pendingOrders: 8,
      completedToday: 9,
      averageConsultationTime: 24, // minutes
      patientSatisfaction: 4.8, // out of 5
    };

    const recentVisits = [
      {
        id: "1",
        patientName: "John Smith",
        time: new Date(Date.now() - 30 * 60000).toISOString(),
        status: "completed",
        diagnosis: "Common Cold",
      },
      {
        id: "2",
        patientName: "Jane Doe",
        time: new Date(Date.now() - 10 * 60000).toISOString(),
        status: "in_progress",
        diagnosis: "Hypertension follow-up",
      },
      {
        id: "3",
        patientName: "Bob Johnson",
        time: new Date(Date.now() + 15 * 60000).toISOString(),
        status: "scheduled",
        diagnosis: "Routine Checkup",
      },
    ];

    return NextResponse.json({
      stats: doctorStats,
      recentVisits,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching doctor analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

