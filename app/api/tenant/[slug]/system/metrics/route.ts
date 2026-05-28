import { execSync } from "child_process";
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { db } from "@/lib/db";
import { auditLogs, systemMetrics, users } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";

function percentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, index);
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}

function formatUptime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const total = Math.floor(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const parts = [
    days > 0 ? `${days}d` : null,
    hours > 0 ? `${hours}h` : null,
    minutes > 0 && days === 0 ? `${minutes}m` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : `${total}s`;
}

async function getDatabaseSizeBytes() {
  try {
    const result = await db.execute(sql`
      SELECT COALESCE(pg_database_size(current_database()), 0)::bigint AS size_bytes
    `);
    const [row] = (result as any).rows as Array<{ size_bytes?: string | number }>;
    return Number(row?.size_bytes || 0);
  } catch (error) {
    console.error("Error fetching database size:", error);
    return 0;
  }
}

async function sampleCpuUsage(intervalMs = 150) {
  const capture = () =>
    os.cpus().map((cpu) => {
      const times = cpu.times;
      return {
        idle: times.idle,
        total: times.user + times.nice + times.sys + times.irq + times.idle,
      };
    });

  const start = capture();
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
  const end = capture();

  let idle = 0;
  let total = 0;
  for (let i = 0; i < start.length; i += 1) {
    const idleDiff = (end[i]?.idle || 0) - (start[i]?.idle || 0);
    const totalDiff = (end[i]?.total || 0) - (start[i]?.total || 0);
    idle += Math.max(0, idleDiff);
    total += Math.max(0, totalDiff);
  }

  if (total <= 0) return 0;
  return percentage(((total - idle) / total) * 100);
}

function getDiskUsage() {
  try {
    const mountPoint = process.platform === "win32" ? path.parse(process.cwd()).root : "/";
    const stats = fs.statfsSync(mountPoint);
    const total = Number(stats.bsize) * Number(stats.blocks);
    const free = Number(stats.bsize) * Number((stats as any).bavail ?? stats.bfree ?? 0);
    const used = Math.max(0, total - free);
    return {
      total,
      free,
      used,
      usagePercent: total > 0 ? Math.round((used / total) * 100) : 0,
      mountPoint,
    };
  } catch (error) {
    console.error("Error getting disk usage:", error);
    return { total: 0, free: 0, used: 0, usagePercent: 0, mountPoint: process.platform === "win32" ? path.parse(process.cwd()).root : "/" };
  }
}

function getNetworkUsage() {
  try {
    if (process.platform === "linux" && fs.existsSync("/proc/net/dev")) {
      const content = fs.readFileSync("/proc/net/dev", "utf8");
      let receivedBytes = 0;
      let sentBytes = 0;
      content.split("\n").forEach((line) => {
        const match = line.match(/^\s*([^:]+):\s+(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)/);
        if (match) {
          receivedBytes += Number(match[2] || 0);
          sentBytes += Number(match[3] || 0);
        }
      });
      return {
        receivedBytes,
        sentBytes,
        totalBytes: receivedBytes + sentBytes,
        source: "proc-net-dev",
      };
    }

    if (process.platform === "win32") {
      const output = execSync("netstat -e", { encoding: "utf8" });
      const bytesLine = output
        .split(/\r?\n/)
        .find((line) => line.trim().toLowerCase().startsWith("bytes"));
      if (bytesLine) {
        const parts = bytesLine.trim().split(/\s+/).filter(Boolean);
        const receivedBytes = Number(parts[1] || 0);
        const sentBytes = Number(parts[2] || 0);
        return {
          receivedBytes,
          sentBytes,
          totalBytes: receivedBytes + sentBytes,
          source: "netstat",
        };
      }
    }

    if (process.platform === "darwin") {
      const output = execSync("netstat -ib", { encoding: "utf8" });
      let receivedBytes = 0;
      let sentBytes = 0;
      output.split(/\r?\n/).forEach((line) => {
        const columns = line.trim().split(/\s+/);
        if (columns.length > 10 && columns[0] !== "Name") {
          receivedBytes += Number(columns[6] || 0);
          sentBytes += Number(columns[9] || 0);
        }
      });
      return {
        receivedBytes,
        sentBytes,
        totalBytes: receivedBytes + sentBytes,
        source: "netstat",
      };
    }
  } catch (error) {
    console.error("Error getting network usage:", error);
  }

  return {
    receivedBytes: 0,
    sentBytes: 0,
    totalBytes: 0,
    source: "unavailable",
  };
}

async function getLiveSystemSnapshot(activeUsers: number) {
  const cpuCount = Math.max(os.cpus().length, 1);
  const memoryTotal = os.totalmem();
  const memoryFree = os.freemem();
  const memoryUsed = memoryTotal - memoryFree;
  const diskUsage = getDiskUsage();
  const networkUsage = getNetworkUsage();
  const cpuUsage = await sampleCpuUsage();
  const databaseSizeBytes = await getDatabaseSizeBytes();
  const responseStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
  } catch (error) {
    console.error("Error measuring database response time:", error);
  }
  const apiResponseTime = Date.now() - responseStart;

  return {
    cpuUsage,
    memoryUsage: percentage((memoryUsed / memoryTotal) * 100),
    diskUsage: diskUsage.usagePercent,
    networkIo: Math.min(100, Math.round((networkUsage.totalBytes / Math.max(memoryUsed, 1)) * 100)),
    overview: {
      uptime: formatUptime(os.uptime()),
      apiResponseTime,
      activeUsers,
      databaseSize: formatBytes(databaseSizeBytes),
      databaseSizeBytes,
      cpuUsage,
      memoryUsage: percentage((memoryUsed / memoryTotal) * 100),
      diskUsage: diskUsage.usagePercent,
      networkIo: Math.min(100, Math.round((networkUsage.totalBytes / Math.max(memoryUsed, 1)) * 100)),
    },
    resourceUsage: {
      cpu: {
        percent: cpuUsage,
        loadAverage: os.loadavg(),
        cores: cpuCount,
      },
      memory: {
        usedBytes: memoryUsed,
        totalBytes: memoryTotal,
        display: `${formatBytes(memoryUsed)} / ${formatBytes(memoryTotal)}`,
      },
      disk: {
        usedBytes: diskUsage.used,
        totalBytes: diskUsage.total,
        display: `${formatBytes(diskUsage.used)} / ${formatBytes(diskUsage.total)}`,
        mountPoint: diskUsage.mountPoint,
      },
      network: {
        receivedBytes: networkUsage.receivedBytes,
        sentBytes: networkUsage.sentBytes,
        totalBytes: networkUsage.totalBytes,
        display: `${formatBytes(networkUsage.receivedBytes)} down / ${formatBytes(networkUsage.sentBytes)} up`,
        source: networkUsage.source,
      },
      database: {
        sizeBytes: databaseSizeBytes,
        display: formatBytes(databaseSizeBytes),
      },
    },
    latest: {
      cpuUsage,
      memoryUsage: percentage((memoryUsed / memoryTotal) * 100),
      diskUsage: diskUsage.usagePercent,
      networkIo: Math.min(100, Math.round((networkUsage.totalBytes / Math.max(memoryUsed, 1)) * 100)),
      databaseSize: formatBytes(databaseSizeBytes),
      activeUsers,
      apiResponseTime,
      uptime: formatUptime(os.uptime()),
      timestamp: new Date().toISOString(),
    },
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);

  try {
    const { searchParams } = new URL(request.url);
    const hours = Math.max(1, Math.min(168, Number(searchParams.get("hours") || "24")));
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const history = await db
      .select()
      .from(systemMetrics)
      .where(and(eq(systemMetrics.tenantId, access.tenant.id), gte(systemMetrics.timestamp, cutoff)))
      .orderBy(desc(systemMetrics.timestamp))
      .limit(500);

    const [activeUsersRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.tenantId, access.tenant.id), eq(users.isActive, true)));

    const live = await getLiveSystemSnapshot(Number(activeUsersRow?.count || 0));
    const historyWithLive = [live.latest, ...history];
    const avg = (selector: (item: any) => number) => historyWithLive.length
      ? Math.round(historyWithLive.reduce((sum, item) => sum + selector(item), 0) / historyWithLive.length)
      : 0;

    const overview = {
      uptime: live.overview.uptime,
      apiResponseTime: live.overview.apiResponseTime,
      activeUsers: live.overview.activeUsers,
      databaseSize: live.overview.databaseSize,
      databaseSizeBytes: live.overview.databaseSizeBytes,
      cpuUsage: live.overview.cpuUsage,
      memoryUsage: live.overview.memoryUsage,
      diskUsage: live.overview.diskUsage,
      networkIo: live.overview.networkIo,
    };

    return NextResponse.json({
      latest: live.latest,
      overview,
      averages: {
        cpu: avg((item) => Number(item.cpuUsage || 0)),
        memory: avg((item) => Number(item.memoryUsage || 0)),
        disk: avg((item) => Number(item.diskUsage || 0)),
        networkIo: avg((item) => Number(item.networkIo || 0)),
      },
      resourceUsage: live.resourceUsage,
      history: historyWithLive,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching system metrics:", error);
    return NextResponse.json({ error: "Failed to fetch system metrics" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);
  if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const [created] = await db.insert(systemMetrics).values({
      tenantId: access.tenant.id,
      cpuUsage: body.cpuUsage,
      memoryUsage: body.memoryUsage,
      diskUsage: body.diskUsage,
      networkIo: body.networkIo,
      databaseSize: body.databaseSize,
      activeUsers: body.activeUsers,
      apiResponseTime: body.apiResponseTime,
      uptime: body.uptime,
    }).returning();

    await db.insert(auditLogs).values({
      tenantId: access.tenant.id,
      userId: access.user?.id || null,
      action: "tenant.system_metric_created",
      entity: "system_metric",
      entityId: created.id,
      metadata: body,
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error("Error creating system metric:", error);
    return NextResponse.json({ error: "Failed to create system metric" }, { status: 500 });
  }
}
