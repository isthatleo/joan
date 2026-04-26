import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const patientStats = {
      nextAppointment: {
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        doctor: "Dr. Sarah Smith",
        specialty: "Cardiology",
        location: "Building A, Room 304",
      },
      recentVisits: 3,
      pendingTest: 1,
      activePrescriptions: 2,
      lastVisited: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      allergies: ["Penicillin", "Sulfonamides"],
      medications: [
        {
          name: "Lisinopril",
          dosage: "10mg",
          frequency: "Daily",
          status: "active",
        },
        {
          name: "Metformin",
          dosage: "1000mg",
          frequency: "Twice daily",
          status: "active",
        },
      ],
    };

    const medicalRecords = [
      {
        id: "MR-001",
        type: "Lab Result",
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Blood Test - Normal",
      },
      {
        id: "MR-002",
        type: "Prescription",
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Prescribed Medications",
      },
      {
        id: "MR-003",
        type: "Visit Note",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Follow-up Consultation",
      },
    ];

    return NextResponse.json({
      stats: patientStats,
      medicalRecords,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching patient data:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient data" },
      { status: 500 }
    );
  }
}

