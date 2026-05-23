import { NextRequest, NextResponse } from "next/server";
import { MessagingService } from "@/lib/services/messaging.service";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";

const service = new MessagingService();

async function resolveCurrentAppUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) {
    return { session, appUser: null };
  }

  const appUser = await db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true },
  });

  return { session, appUser };
}

async function canAccessUser(sessionEmail: string | undefined, userId: string) {
  if (!sessionEmail) return false;
  const matchingUser = await db.query.users.findFirst({
    where: and(eq(users.id, userId), ilike(users.email, sessionEmail), isNull(users.deletedAt)),
    columns: { id: true },
  });
  return !!matchingUser;
}

export async function GET(request: NextRequest) {
  try {
    const { session, appUser } = await resolveCurrentAppUser(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || appUser?.id || (session.user.id as string);
    const otherUserId = searchParams.get("otherUserId");
    const type = searchParams.get("type") || "conversations";
    const search = searchParams.get("search") || undefined;

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }
    if (!(await canAccessUser(session.user.email, userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
            where: and(eq(users.id, otherUserId), isNull(users.deletedAt)),
            columns: {
              id: true,
              fullName: true,
              email: true,
              avatar: true,
              role: true,
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

      case "available-users":
        const users = await service.getAvailableContacts(userId, search);
        return NextResponse.json(users);

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
    const { session, appUser } = await resolveCurrentAppUser(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    if (!appUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (data.senderId && !(await canAccessUser(session.user.email, data.senderId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    data.senderId = appUser.id;

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
