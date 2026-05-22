import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = resolvedParams;

    // Mock data - replace with actual database queries
    const emergencyAlerts = [
      {
        id: "1",
        patientId: "patient_001",
        patientName: "Robert Wilson",
        type: "cardiac",
        severity: "critical",
        location: "Room 203",
        description: "Patient experiencing chest pain and shortness of breath. Heart rate: 120 BPM, BP: 180/110",
        reportedBy: "Nurse Johnson",
        reportedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        status: "responding",
        assignedTeam: "Cardiac Response Team A",
        eta: "2 minutes",
        vitalSigns: {
          heartRate: 120,
          bloodPressure: "180/110",
          oxygenSaturation: 92,
          temperature: 98.6,
          respiratoryRate: 24
        }
      },
      {
        id: "2",
        patientId: "patient_002",
        patientName: "Maria Garcia",
        type: "trauma",
        severity: "urgent",
        location: "Emergency Bay 1",
        description: "Motor vehicle accident victim with possible head injury",
        reportedBy: "Paramedic Unit 5",
        reportedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
        status: "active",
        vitalSigns: {
          heartRate: 95,
          bloodPressure: "140/90",
          oxygenSaturation: 98,
          temperature: 97.8,
          respiratoryRate: 18
        }
      }
    ];

    return NextResponse.json(emergencyAlerts);
  } catch (error) {
    console.error("Failed to fetch emergency alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch emergency alerts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = resolvedParams;
    const alertData = await request.json();

    // Mock emergency alert creation - replace with actual emergency response system
    const newAlert = {
      id: `emergency_${Date.now()}`,
      ...alertData,
      reportedAt: new Date().toISOString(),
      status: "active"
    };

    console.log("Emergency alert created:", newAlert);

    return NextResponse.json(newAlert);
  } catch (error) {
    console.error("Failed to create emergency alert:", error);
    return NextResponse.json(
      { error: "Failed to create emergency alert" },
      { status: 500 }
    );
  }
}
