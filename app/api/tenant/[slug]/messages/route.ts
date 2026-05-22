import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const slug = resolvedParams.slug;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "inbox";

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Mock messages data
    const mockMessages = [
      {
        id: "msg1",
        subject: "System Maintenance Notice",
        content: "The system will undergo maintenance on Saturday evening. Please plan accordingly.",
        sender: { id: "user1", name: "Admin User", role: "admin", avatar: null },
        recipient: { id: "user2", name: "Staff", role: "staff" },
        type: "direct" as const,
        priority: "high" as const,
        status: type === "sent" ? "sent" : "delivered",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        readAt: type === "sent" ? undefined : new Date(Date.now() - 1800000).toISOString()
      },
      {
        id: "msg2",
        subject: "Department Meeting Tomorrow",
        content: "Don't forget about the department meeting tomorrow at 2 PM in the conference room.",
        sender: { id: "user3", name: "Manager", role: "manager", avatar: null },
        recipient: { id: "user2", name: "User", role: "user" },
        type: "direct" as const,
        priority: "normal" as const,
        status: type === "sent" ? "sent" : "read",
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        readAt: type === "sent" ? undefined : new Date(Date.now() - 3600000).toISOString()
      }
    ];

    const mockConversations = [
      {
        id: "conv1",
        participants: [
          { id: "user1", name: "Admin User", role: "admin" },
          { id: "user2", name: "Staff Member", role: "staff" }
        ],
        lastMessage: mockMessages[0],
        unreadCount: 0,
        updatedAt: new Date().toISOString()
      }
    ];

    return NextResponse.json({
      messages: type === "drafted" ? [] : mockMessages,
      conversations: mockConversations
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
