import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const slug = resolvedParams.slug;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Mock insurance claims data
    const mockClaims = [
      {
        id: "claim1",
        claimNumber: "CLM-2026-001",
        patient: { id: "pat1", name: "John Doe", insuranceNumber: "INS-123456", provider: "Blue Cross" },
        service: {
          type: "Consultation",
          description: "General practitioner consultation",
          dateOfService: new Date(Date.now() - 604800000).toISOString(),
          billedAmount: 250,
          claimedAmount: 250
        },
        status: "paid" as const,
        submittedAt: new Date(Date.now() - 432000000).toISOString(),
        processedAt: new Date(Date.now() - 259200000).toISOString(),
        approvedAmount: 250,
        createdBy: { id: "user1", name: "Billing Staff", role: "accountant" }
      },
      {
        id: "claim2",
        claimNumber: "CLM-2026-002",
        patient: { id: "pat2", name: "Jane Smith", insuranceNumber: "INS-789012", provider: "Aetna" },
        service: {
          type: "Lab Tests",
          description: "Blood work and analysis",
          dateOfService: new Date(Date.now() - 259200000).toISOString(),
          billedAmount: 450,
          claimedAmount: 450
        },
        status: "approved" as const,
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
        processedAt: new Date(Date.now() - 43200000).toISOString(),
        approvedAmount: 400,
        createdBy: { id: "user2", name: "Lab Manager", role: "manager" }
      }
    ];

    const filtered = mockClaims.filter(claim => status === "all" || claim.status === status);
    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Error fetching insurance claims:", error);
    return NextResponse.json({ error: "Failed to fetch insurance claims" }, { status: 500 });
  }
}
