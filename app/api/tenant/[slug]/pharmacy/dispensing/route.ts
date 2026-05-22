import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    // Mock dispensing items
    const dispensing = [
      {
        id: "disp-001",
        prescriptionId: "rx-2024-001",
        patientName: "John Doe",
        patientId: "pat-001",
        medications: [
          {
            medicationId: "med-001",
            name: "Amoxicillin",
            dosage: "500mg",
            quantity: 30,
            dispensed: 0,
            instructions: "Take one capsule three times daily",
          },
        ],
        status: "pending",
        priority: "normal",
        createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
      },
      {
        id: "disp-002",
        prescriptionId: "rx-2024-003",
        patientName: "Jane Smith",
        patientId: "pat-002",
        medications: [
          {
            medicationId: "med-002",
            name: "Metformin",
            dosage: "1000mg",
            quantity: 60,
            dispensed: 30,
            instructions: "Take one tablet twice daily",
          },
        ],
        status: "in-progress",
        priority: "normal",
        createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
      },
      {
        id: "disp-003",
        prescriptionId: "rx-2024-005",
        patientName: "Bob Wilson",
        patientId: "pat-003",
        medications: [
          {
            medicationId: "med-003",
            name: "Ibuprofen",
            dosage: "400mg",
            quantity: 20,
            dispensed: 20,
            instructions: "Take as needed for pain",
          },
        ],
        status: "dispensed",
        priority: "urgent",
        createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
        completedAt: new Date(Date.now() - 50 * 60000).toISOString(),
      },
    ];

    const filtered = status === "all" ? dispensing : dispensing.filter(d => d.status === status);
    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Error fetching dispensing queue:", error);
    return NextResponse.json({ error: "Failed to fetch dispensing queue" }, { status: 500 });
  }
}

