import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    // Mock prescriptions
    const prescriptions = [
      {
        id: "rx-2024-001",
        patientId: "pat-001",
        patientName: "John Doe",
        patientPhone: "555-0101",
        doctorId: "doc-001",
        doctorName: "Dr. Smith",
        medications: [
          {
            medicationId: "med-001",
            name: "Amoxicillin",
            dosage: "500mg",
            quantity: 30,
            instructions: "Take one capsule three times daily for 10 days",
            refills: 0,
          },
        ],
        status: "pending",
        priority: "normal",
        createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60000).toISOString(),
      },
      {
        id: "rx-2024-002",
        patientId: "pat-002",
        patientName: "Jane Smith",
        patientPhone: "555-0102",
        doctorId: "doc-002",
        doctorName: "Dr. Johnson",
        medications: [
          {
            medicationId: "med-002",
            name: "Metformin",
            dosage: "1000mg",
            quantity: 60,
            instructions: "Take one tablet twice daily with meals",
            refills: 2,
          },
        ],
        status: "filled",
        priority: "normal",
        createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
        filledAt: new Date(Date.now() - 10 * 60000).toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60000).toISOString(),
      },
      {
        id: "rx-2024-003",
        patientId: "pat-003",
        patientName: "Bob Wilson",
        patientPhone: "555-0103",
        doctorId: "doc-003",
        doctorName: "Dr. Lee",
        medications: [
          {
            medicationId: "med-003",
            name: "Ibuprofen",
            dosage: "400mg",
            quantity: 20,
            instructions: "Take one tablet every 6-8 hours as needed for pain",
            refills: 1,
          },
        ],
        status: "pending",
        priority: "urgent",
        createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60000).toISOString(),
      },
    ];

    // Filter by status if provided
    const filtered = status === "all" ? prescriptions : prescriptions.filter(p => p.status === status);

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json({ error: "Failed to fetch prescriptions" }, { status: 500 });
  }
}

