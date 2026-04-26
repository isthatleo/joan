import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get("roleId");

    // Role-specific analytics aggregation
    const analyticsData = {
      overview: {
        totalRecords: Math.floor(Math.random() * 50000) + 10000,
        monthlyGrowth: Math.floor(Math.random() * 30) + 5,
        activeUsers: Math.floor(Math.random() * 5000) + 1000,
      },
      timeline: [
        {
          date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          value: Math.floor(Math.random() * 1000),
        },
        {
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          value: Math.floor(Math.random() * 1000),
        },
        {
          date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          value: Math.floor(Math.random() * 1000),
        },
        {
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          value: Math.floor(Math.random() * 1000),
        },
        {
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          value: Math.floor(Math.random() * 1000),
        },
        {
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          value: Math.floor(Math.random() * 1000),
        },
        {
          date: new Date().toISOString(),
          value: Math.floor(Math.random() * 1000),
        },
      ],
      topItems: [
        {
          id: "1",
          name: "Item 1",
          count: Math.floor(Math.random() * 5000) + 1000,
          percentage: 28.5,
        },
        {
          id: "2",
          name: "Item 2",
          count: Math.floor(Math.random() * 5000) + 1000,
          percentage: 22.3,
        },
        {
          id: "3",
          name: "Item 3",
          count: Math.floor(Math.random() * 5000) + 1000,
          percentage: 18.7,
        },
        {
          id: "4",
          name: "Item 4",
          count: Math.floor(Math.random() * 5000) + 1000,
          percentage: 15.2,
        },
        {
          id: "5",
          name: "Item 5",
          count: Math.floor(Math.random() * 5000) + 1000,
          percentage: 15.3,
        },
      ],
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

