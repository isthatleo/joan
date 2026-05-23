import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { systemMetrics, tenants } from "@/lib/db/schema";
import { eq, desc, gte } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get("hours") || "24");

    // Get tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get metrics from last N hours
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const metrics = await db
      .select()
      .from(systemMetrics)
      .where((m) => {
        const conditions: any[] = [eq(m.tenantId, tenant.id)];
        if (hours > 0) {
          conditions.push(gte(m.timestamp, cutoffTime));
        }
        return conditions.length === 1 ? conditions[0] : undefined;
      })
      .orderBy(desc(systemMetrics.timestamp))
      .limit(1000);

    // Get latest metrics
    const latest = metrics[0] || null;

    // Calculate averages
    const cpu = metrics.length > 0 ? Math.round(metrics.reduce((sum, m) => sum + (m.cpuUsage || 0), 0) / metrics.length) : 0;
    const memory = metrics.length > 0 ? Math.round(metrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0) / metrics.length) : 0;
    const disk = metrics.length > 0 ? Math.round(metrics.reduce((sum, m) => sum + (m.diskUsage || 0), 0) / metrics.length) : 0;

    return NextResponse.json({
      latest,
      averages: { cpu, memory, disk },
      history: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching system metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch system metrics" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    // Get tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Insert new metric
    const metric = await db
      .insert(systemMetrics)
      .values({
        tenantId: tenant.id,
        cpuUsage: body.cpuUsage,
        memoryUsage: body.memoryUsage,
        diskUsage: body.diskUsage,
        networkIo: body.networkIo,
        databaseSize: body.databaseSize,
        activeUsers: body.activeUsers,
        apiResponseTime: body.apiResponseTime,
        uptime: body.uptime,
      })
      .returning();

    return NextResponse.json(metric[0]);
  } catch (error) {
    console.error("Error creating system metric:", error);
    return NextResponse.json(
      { error: "Failed to create system metric" },
      { status: 500 }
    );
  }
}

