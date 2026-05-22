import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const slug = resolvedParams.slug;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "all";
    const status = searchParams.get("status") || "all";
    const dateRange = searchParams.get("dateRange") || "7d";

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Mock audit logs data
    const mockLogs = [
      {
        id: "log1",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        user: { id: "user1", name: "Admin User", role: "admin", email: "admin@hospital.com" },
        action: "User Login",
        resource: "authentication",
        resourceId: "sess-1234",
        details: "User logged in successfully",
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0",
        status: "success" as const,
        category: "authentication" as const
      },
      {
        id: "log2",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        user: { id: "user2", name: "Manager", role: "manager", email: "manager@hospital.com" },
        action: "Patient Record Updated",
        resource: "patients",
        resourceId: "pat-456",
        details: "Patient contact information updated",
        ipAddress: "192.168.1.101",
        userAgent: "Mozilla/5.0",
        status: "success" as const,
        category: "data" as const
      }
    ];

    let filtered = mockLogs;
    if (category !== "all") {
      filtered = filtered.filter(log => log.category === category);
    }
    if (status !== "all") {
      filtered = filtered.filter(log => log.status === status);
    }

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
