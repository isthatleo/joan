import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const slug = resolvedParams.slug;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Mock broadcasts data
    const mockBroadcasts = [
      {
        id: "bc1",
        title: "System Update Completed",
        message: "The system has been successfully updated with new features and improvements.",
        type: "announcement" as const,
        priority: "normal" as const,
        targetAudience: ["all"],
        status: "sent" as const,
        sentAt: new Date(Date.now() - 3600000).toISOString(),
        recipientCount: 156,
        readCount: 142,
        createdBy: { id: "user1", name: "Admin User", role: "admin" },
        createdAt: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: "bc2",
        title: "Maintenance Notice",
        message: "Scheduled maintenance will occur this weekend. Plan accordingly.",
        type: "alert" as const,
        priority: "high" as const,
        targetAudience: ["staff", "admin"],
        status: "scheduled" as const,
        scheduledFor: new Date(Date.now() + 86400000).toISOString(),
        recipientCount: 89,
        readCount: 0,
        createdBy: { id: "user2", name: "Manager", role: "manager" },
        createdAt: new Date(Date.now() - 1800000).toISOString()
      }
    ];

    const filtered = mockBroadcasts.filter(bc => status === "all" || bc.status === status);
    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Error fetching broadcasts:", error);
    return NextResponse.json({ error: "Failed to fetch broadcasts" }, { status: 500 });
  }
}
