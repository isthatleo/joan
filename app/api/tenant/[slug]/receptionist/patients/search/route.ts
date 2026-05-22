import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = resolvedParams;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Mock data - replace with actual database queries
    const mockPatients = [
      {
        id: "1",
        firstName: "Sarah",
        lastName: "Johnson",
        dateOfBirth: "1985-03-15",
        phone: "(555) 123-4567",
        email: "sarah.johnson@email.com",
        medicalRecordNumber: "MRN001234"
      },
      {
        id: "2",
        firstName: "Michael",
        lastName: "Chen",
        dateOfBirth: "1990-07-22",
        phone: "(555) 234-5678",
        email: "michael.chen@email.com",
        medicalRecordNumber: "MRN001235"
      },
      {
        id: "3",
        firstName: "Emily",
        lastName: "Rodriguez",
        dateOfBirth: "1978-11-08",
        phone: "(555) 345-6789",
        email: "emily.rodriguez@email.com",
        medicalRecordNumber: "MRN001236"
      },
      {
        id: "4",
        firstName: "James",
        lastName: "Brown",
        dateOfBirth: "1965-05-12",
        phone: "(555) 456-7890",
        email: "james.brown@email.com",
        medicalRecordNumber: "MRN001237"
      },
      {
        id: "5",
        firstName: "Lisa",
        lastName: "Anderson",
        dateOfBirth: "1992-09-30",
        phone: "(555) 567-8901",
        email: "lisa.anderson@email.com",
        medicalRecordNumber: "MRN001238"
      }
    ];

    // Filter patients based on search query
    const filteredPatients = mockPatients.filter(patient =>
      patient.firstName.toLowerCase().includes(query.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(query.toLowerCase()) ||
      patient.phone.includes(query) ||
      patient.medicalRecordNumber.toLowerCase().includes(query.toLowerCase())
    );

    return NextResponse.json(filteredPatients);
  } catch (error) {
    console.error("Failed to search patients:", error);
    return NextResponse.json(
      { error: "Failed to search patients" },
      { status: 500 }
    );
  }
}
