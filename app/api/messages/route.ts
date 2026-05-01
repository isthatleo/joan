import { NextRequest, NextResponse } from "next/server";
import { MessagingService } from "@/lib/services/messaging.service";

const service = new MessagingService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const otherUserId = searchParams.get("otherUserId");
    const type = searchParams.get("type") || "conversations";

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    switch (type) {
      case "conversations":
        const conversations = await service.getConversations(userId);
        return NextResponse.json({ conversations });

      case "chat":
        if (!otherUserId) {
          return NextResponse.json({ error: "Other user ID required for chat" }, { status: 400 });
        }
        const messages = await service.getChatMessages(userId, otherUserId);
        let otherUser = null;
        if (messages.length === 0) {
          // If no messages, fetch the other user's info so the UI can display their name
          const { db } = await import("@/lib/db");
          const { users } = await import("@/lib/db/schema");
          const { eq } = await import("drizzle-orm");
          otherUser = await db.query.users.findFirst({
            where: eq(users.id, otherUserId),
            columns: {
              id: true,
              fullName: true,
              email: true,
            },
          });
        }
        return NextResponse.json({ messages, otherUser });

      case "broadcasts":
        const broadcasts = await service.getBroadcasts(userId);
        return NextResponse.json({ broadcasts });

      case "unread":
        const unreadCount = await service.getInboxCount(userId);
        return NextResponse.json({ unreadCount });

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (data.type === "broadcast") {
      const messages = await service.sendBroadcast(data);
      return NextResponse.json({ messages });
    } else {
      const message = await service.sendMessage(data);
      return NextResponse.json({ message });
    }
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to send message" }, { status: 500 });
  }
}
