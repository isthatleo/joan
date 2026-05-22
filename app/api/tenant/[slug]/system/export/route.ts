import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { systemMetrics, systemAlerts, tenants } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const format = searchParams.get("format") || "json";

    // Get tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get data from last N days
    const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const metrics = await db
      .select()
      .from(systemMetrics)
      .where((m) => m.tenantId === tenant.id && m.timestamp >= cutoffTime)
      .orderBy(desc(systemMetrics.timestamp));

    const alerts = await db
      .select()
      .from(systemAlerts)
      .where((a) => a.tenantId === tenant.id && a.createdAt >= cutoffTime)
      .orderBy(desc(systemAlerts.createdAt));

    const report = {
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
        id: tenant.id,
      },
      period: {
        start: cutoffTime.toISOString(),
        end: new Date().toISOString(),
        days,
      },
      metrics: {
        total: metrics.length,
        avgCpu: Math.round(
          metrics.reduce((sum, m) => sum + (m.cpuUsage || 0), 0) / metrics.length
        ),
        avgMemory: Math.round(
          metrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0) /
            metrics.length
        ),
        avgDisk: Math.round(
          metrics.reduce((sum, m) => sum + (m.diskUsage || 0), 0) / metrics.length
        ),
        peakCpu: Math.max(...metrics.map((m) => m.cpuUsage || 0)),
        peakMemory: Math.max(...metrics.map((m) => m.memoryUsage || 0)),
        peakDisk: Math.max(...metrics.map((m) => m.diskUsage || 0)),
        data: metrics,
      },
      alerts: {
        total: alerts.length,
        critical: alerts.filter((a) => a.severity === "critical").length,
        warning: alerts.filter((a) => a.severity === "warning").length,
        info: alerts.filter((a) => a.severity === "info").length,
        data: alerts,
      },
      generatedAt: new Date().toISOString(),
    };

    if (format === "csv") {
      // Generate CSV
      let csv = "System Health Report\n";
      csv += `Tenant: ${tenant.name}\n`;
      csv += `Period: ${cutoffTime.toISOString()} to ${new Date().toISOString()}\n\n`;

      csv += "METRICS SUMMARY\n";
      csv += `Total Readings,${metrics.length}\n`;
      csv += `Avg CPU Usage,${report.metrics.avgCpu}%\n`;
      csv += `Avg Memory Usage,${report.metrics.avgMemory}%\n`;
      csv += `Avg Disk Usage,${report.metrics.avgDisk}%\n`;
      csv += `Peak CPU Usage,${report.metrics.peakCpu}%\n`;
      csv += `Peak Memory Usage,${report.metrics.peakMemory}%\n`;
      csv += `Peak Disk Usage,${report.metrics.peakDisk}%\n\n`;

      csv += "ALERTS SUMMARY\n";
      csv += `Total Alerts,${alerts.length}\n`;
      csv += `Critical,${report.alerts.critical}\n`;
      csv += `Warning,${report.alerts.warning}\n`;
      csv += `Info,${report.alerts.info}\n\n`;

      csv += "METRIC DETAILS\n";
      csv += "Timestamp,CPU Usage,Memory Usage,Disk Usage,Network I/O,Active Users,API Response Time\n";
      metrics.forEach((m) => {
        csv += `${m.timestamp},${m.cpuUsage},${m.memoryUsage},${m.diskUsage},${m.networkIo},${m.activeUsers},${m.apiResponseTime}\n`;
      });

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="system-report-${slug}-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // JSON format
    return NextResponse.json(report);
  } catch (error) {
    console.error("Error exporting system report:", error);
    return NextResponse.json(
      { error: "Failed to export system report" },
      { status: 500 }
    );
  }
}

