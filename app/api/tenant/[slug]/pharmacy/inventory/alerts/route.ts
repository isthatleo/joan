import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";

    // Mock stock alerts
    const alerts = [
      {
        id: "alert-stock-001",
        medicationId: "med-004",
        medicationName: "Lisinopril 10mg",
        currentStock: 0,
        minStock: 100,
        reorderQuantity: 300,
        supplier: "CardioHealth",
        alertType: "out-of-stock",
        isActive: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60000).toISOString(),
      },
      {
        id: "alert-stock-002",
        medicationId: "med-002",
        medicationName: "Metformin 1000mg",
        currentStock: 234,
        minStock: 200,
        reorderQuantity: 500,
        supplier: "MediPharm",
        alertType: "low-stock",
        isActive: true,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60000).toISOString(),
      },
      {
        id: "alert-stock-003",
        medicationId: "med-001",
        medicationName: "Amoxicillin 500mg",
        currentStock: 456,
        minStock: 100,
        reorderQuantity: 1000,
        supplier: "PharmaCorp",
        alertType: "low-stock",
        isActive: true,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60000).toISOString(),
      },
      {
        id: "alert-stock-004",
        medicationId: "med-005",
        medicationName: "Simvastatin 20mg",
        currentStock: 567,
        minStock: 200,
        reorderQuantity: 1000,
        supplier: "PharmaCorp",
        alertType: "expiring-soon",
        isActive: true,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60000).toISOString(),
      },
    ];

    const filtered = type === "all" ? alerts : alerts.filter(a => a.alertType === type);
    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Error fetching stock alerts:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

