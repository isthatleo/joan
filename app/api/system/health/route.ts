import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get("metric") || "all";

    const timestamp = new Date();
    const uptime = 99.98;
    const cpuUsage = 32.5;
    const memoryUsage = 45.2;
    const diskUsage = 62.8;
    const databaseConnections = 128;

    const systemHealth = {
      status: "operational",
      uptime,
      services: {
        api: {
          status: "operational",
          responseTime: "145ms",
          uptime: "99.99%",
        },
        database: {
          status: "operational",
          connections: databaseConnections,
          queryTime: "32ms",
          uptime: "99.98%",
        },
        redis: {
          status: "operational",
          hitRate: "94.2%",
          uptime: "99.95%",
        },
        storage: {
          status: "operational",
          available: "847GB",
          used: "156GB",
        },
      },
      resources: {
        cpu: cpuUsage,
        memory: memoryUsage,
        disk: diskUsage,
      },
      alerts: [
        {
          id: "1",
          severity: "warning",
          title: "High CPU usage detected",
          message: "CPU usage is at 72% on server-3",
          timestamp: new Date(timestamp.getTime() - 5 * 60000).toISOString(),
        },
        {
          id: "2",
          severity: "info",
          title: "Scheduled maintenance completed",
          message: "Database optimization completed successfully",
          timestamp: new Date(timestamp.getTime() - 30 * 60000).toISOString(),
        },
      ],
      timestamp: timestamp.toISOString(),
    };

    return NextResponse.json(systemHealth);
  } catch (error) {
    console.error("Error fetching system health:", error);
    return NextResponse.json(
      { error: "Failed to fetch system health" },
      { status: 500 }
    );
  }
}

