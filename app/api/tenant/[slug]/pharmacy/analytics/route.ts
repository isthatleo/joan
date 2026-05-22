import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30days";

    // Mock analytics data
    const analytics = {
      totalRevenue: 45230.50,
      revenueGrowth: 8.5,
      totalPrescriptions: 287,
      prescriptionsGrowth: 5.2,
      averagePrescriptionValue: 157.50,
      totalDispensed: 456,
      dispensingAccuracy: 98.5,
      averageFillTime: 12.5,
      topMedications: [
        {
          name: "Amoxicillin 500mg",
          count: 87,
          revenue: 21.75,
        },
        {
          name: "Metformin 1000mg",
          count: 65,
          revenue: 9.75,
        },
        {
          name: "Lisinopril 10mg",
          count: 54,
          revenue: 18.90,
        },
        {
          name: "Simvastatin 20mg",
          count: 45,
          revenue: 20.25,
        },
        {
          name: "Ibuprofen 400mg",
          count: 123,
          revenue: 9.84,
        },
      ],
      monthlyData: [
        {
          month: "Jan",
          revenue: 35000,
          prescriptions: 220,
        },
        {
          month: "Feb",
          revenue: 38500,
          prescriptions: 245,
        },
        {
          month: "Mar",
          revenue: 42000,
          prescriptions: 268,
        },
        {
          month: "Apr",
          revenue: 45230.50,
          prescriptions: 287,
        },
      ],
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}

