import { NextRequest, NextResponse } from "next/server";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (tenantId) {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
      });

      if (!tenant) {
        return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
      }
    }

    // Get system information
    const systemInfo = {
      // Physical memory
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      usedMemory: os.totalmem() - os.freemem(),
      memoryUsagePercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),

      // CPU information
      cpuCount: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || "Unknown",
      loadAverage: os.loadavg(),

      // System uptime
      uptime: os.uptime(),

      // Platform info
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),

      diskUsage: await getDiskUsage(),

      storage: await getStorageMetrics(),

      // Database connection status
      databaseStatus: await checkDatabaseConnection(),

      // Application metrics
      nodeVersion: process.version,
      processUptime: process.uptime(),
      processMemoryUsage: process.memoryUsage(),

      // Network information
      networkInterfaces: getNetworkInfo(),

      // Timestamp
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      cpuUsage: Math.round(
        Math.min(100, Math.max(0, (systemInfo.loadAverage[0] * 100) / Math.max(systemInfo.cpuCount, 1)))
      ),
      memoryUsage: systemInfo.memoryUsagePercent,
      diskUsage: systemInfo.diskUsage.usagePercent,
      uptime: 100,
      data: systemInfo,
    });
  } catch (error) {
    console.error("[system-metrics GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch system metrics" },
      { status: 500 }
    );
  }
}

async function getDiskUsage() {
  try {
    const rootPath = process.platform === "win32" ? "C:\\" : "/";
    fs.statSync(rootPath);
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const appStorageUsed = await getDirectorySize(uploadsDir);
    const totalSpace = Number(process.env.LOCAL_STORAGE_QUOTA_BYTES || process.env.STORAGE_QUOTA_BYTES || 0);
    const freeSpace = totalSpace > 0 ? Math.max(0, totalSpace - appStorageUsed) : 0;

    return {
      total: totalSpace,
      free: freeSpace,
      used: appStorageUsed,
      usagePercent: totalSpace > 0 ? Math.round((appStorageUsed / totalSpace) * 100) : 0,
      mountPoint: rootPath,
    };
  } catch (error) {
    console.error("Error getting disk usage:", error);
    return {
      total: 0,
      free: 0,
      used: 0,
      usagePercent: 0,
      mountPoint: "/",
    };
  }
}

async function getStorageMetrics() {
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const uploadsSize = await getDirectorySize(uploadsDir);
    const storageQuota = Number(process.env.LOCAL_STORAGE_QUOTA_BYTES || process.env.STORAGE_QUOTA_BYTES || 10000000000);

    return {
      provider: process.env.STORAGE_PROVIDER_NAME || "Local upload storage",
      totalStorage: storageQuota,
      usedStorage: uploadsSize,
      freeStorage: Math.max(0, storageQuota - uploadsSize),
      usagePercent: storageQuota > 0 ? Math.round((uploadsSize / storageQuota) * 100) : 0,
      buckets: [
        {
          name: "uploads",
          size: uploadsSize,
          objectCount: await getFileCount(uploadsDir),
        },
      ],
    };
  } catch (error) {
    console.error("Error getting cloud storage metrics:", error);
    return {
      provider: "Unknown",
      totalStorage: 0,
      usedStorage: 0,
      freeStorage: 0,
      usagePercent: 0,
      buckets: [],
    };
  }
}

// Helper function to get directory size recursively
async function getDirectorySize(dirPath: string): Promise<number> {
  try {
    let totalSize = 0;

    function calculateSize(itemPath: string): void {
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        const items = fs.readdirSync(itemPath);
        items.forEach(item => {
          calculateSize(path.join(itemPath, item));
        });
      } else {
        totalSize += stats.size;
      }
    }

    calculateSize(dirPath);
    return totalSize;
  } catch (error) {
    console.error("Error calculating directory size:", error);
    return 0;
  }
}

// Helper function to get file count recursively
async function getFileCount(dirPath: string): Promise<number> {
  try {
    let count = 0;

    function countFiles(itemPath: string): void {
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        const items = fs.readdirSync(itemPath);
        items.forEach(item => {
          countFiles(path.join(itemPath, item));
        });
      } else {
        count++;
      }
    }

    countFiles(dirPath);
    return count;
  } catch (error) {
    console.error("Error counting files:", error);
    return 0;
  }
}

// Helper function to check database connection
async function checkDatabaseConnection() {
  try {
    const startTime = Date.now();
    // Simple database health check
    await db.execute("SELECT 1");
    const responseTime = Date.now() - startTime;

    return {
      status: "healthy",
      responseTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Database connection check failed:", error);
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      lastChecked: new Date().toISOString(),
    };
  }
}

// Helper function to get network information
function getNetworkInfo() {
  try {
    const interfaces = os.networkInterfaces();
    const networkInfo: any[] = [];

    Object.entries(interfaces).forEach(([name, addresses]) => {
      if (addresses) {
        addresses.forEach((addr) => {
          if (!addr.internal) {
            networkInfo.push({
              interface: name,
              address: addr.address,
              family: addr.family,
              mac: addr.mac,
            });
          }
        });
      }
    });

    return networkInfo;
  } catch (error) {
    console.error("Error getting network info:", error);
    return [];
  }
}
