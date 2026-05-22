import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;
    const { searchParams } = new URL(request.url);
    const today = searchParams.get("today");

    // Mock dispensals data
    const dispensals = [
      {
        id: "disp-001",
        prescriptionId: "rx-2024-001",
        patientName: "John Doe",
        patientId: "pat-001",
        medication: "Amoxicillin 500mg",
        quantity: 30,
        status: "pending",
        time: "09:15 AM",
      },
      {
        id: "disp-002",
        prescriptionId: "rx-2024-002",
        patientName: "Jane Smith",
        patientId: "pat-002",
        medication: "Metformin 1000mg",
        quantity: 60,
        status: "dispensed",
        time: "09:45 AM",
      },
      {
        id: "disp-003",
        prescriptionId: "rx-2024-003",
        patientName: "Bob Wilson",
        patientId: "pat-003",
        medication: "Ibuprofen 400mg",
        quantity: 20,
        status: "partial",
        time: "10:20 AM",
      },
      {
        id: "disp-004",
        prescriptionId: "rx-2024-004",
        patientName: "Carol Davis",
        patientId: "pat-004",
        medication: "Lisinopril 10mg",
        quantity: 30,
        status: "pending",
        time: "10:55 AM",
      },
      {
        id: "disp-005",
        prescriptionId: "rx-2024-005",
        patientName: "David Miller",
        patientId: "pat-005",
        medication: "Simvastatin 20mg",
        quantity: 90,
        status: "dispensed",
        time: "11:30 AM",
      },
    ];

    return NextResponse.json(dispensals);
  } catch (error) {
    console.error("Error fetching dispensals:", error);
    return NextResponse.json({ error: "Failed to fetch dispensals" }, { status: 500 });
  }
}

