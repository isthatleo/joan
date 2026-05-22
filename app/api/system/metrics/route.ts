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

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
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

      // Disk usage
      diskUsage: await getDiskUsage(),

      // Cloud storage metrics (mock data - replace with actual cloud provider API calls)
      cloudStorage: await getCloudStorageMetrics(),

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

// Helper function to get disk usage
async function getDiskUsage() {
  try {
    const rootPath = process.platform === "win32" ? "C:\\" : "/";

    // Use fs.statSync to get basic disk info
    const stats = fs.statSync(rootPath);

    // For Windows, we'll estimate disk usage
    // In production, you'd use a proper disk monitoring library
    const totalSpace = 1000000000000; // 1TB mock
    const freeSpace = 500000000000;   // 500GB mock
    const usedSpace = totalSpace - freeSpace;

    return {
      total: totalSpace,
      free: freeSpace,
      used: usedSpace,
      usagePercent: Math.round((usedSpace / totalSpace) * 100),
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

// Helper function to get cloud storage metrics
async function getCloudStorageMetrics() {
  try {
    // Mock cloud storage metrics
    // In production, replace with actual API calls to your cloud provider
    // (AWS S3, Google Cloud Storage, Azure Blob Storage, etc.)

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const uploadsSize = await getDirectorySize(uploadsDir);

    return {
      provider: "Local Storage", // Replace with actual provider
      totalStorage: 10000000000, // 10GB
      usedStorage: uploadsSize,
      freeStorage: 10000000000 - uploadsSize,
      usagePercent: Math.round((uploadsSize / 10000000000) * 100),
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
