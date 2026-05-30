import { NextRequest, NextResponse } from "next/server";
import { MessagingService } from "@/lib/services/messaging.service";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { getTenantSubdomain } from "@/lib/tenant-routing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const service = new MessagingService();

async function resolveCurrentAppUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) {
    return { session, appUser: null };
  }

  const appUser = await db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true, tenantId: true },
  });

  let messagingTenantId = appUser?.tenantId || null;
  if (!messagingTenantId) {
    const hostSlug = getTenantSubdomain(request.headers.get("host"));
    if (hostSlug) {
      messagingTenantId = await getTenantIdBySlug(hostSlug);
    }
  }

  if (!messagingTenantId && appUser?.id) {
    const adminTenant = await db.query.tenants.findFirst({
      where: eq(tenants.adminUserId, appUser.id),
      columns: { id: true },
    });
    messagingTenantId = adminTenant?.id || null;
  }

  return { session, appUser, messagingTenantId };
}

async function canAccessUser(sessionEmail: string | undefined, userId: string) {
  if (!sessionEmail) return false;
  const matchingUser = await db.query.users.findFirst({
    where: and(eq(users.id, userId), ilike(users.email, sessionEmail), isNull(users.deletedAt)),
    columns: { id: true },
  });
  return !!matchingUser;
}

async function resolveMessageUserId(sessionEmail: string | undefined, requestedUserId: string | null, appUserId?: string | null) {
  if (requestedUserId && await canAccessUser(sessionEmail, requestedUserId)) {
    return requestedUserId;
  }

  if (appUserId && await canAccessUser(sessionEmail, appUserId)) {
    return appUserId;
  }

  if (sessionEmail) {
    const emailUser = await db.query.users.findFirst({
      where: and(ilike(users.email, sessionEmail), isNull(users.deletedAt)),
      columns: { id: true },
    });
    if (emailUser?.id) return emailUser.id;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { session, appUser, messagingTenantId } = await resolveCurrentAppUser(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = await resolveMessageUserId(session.user.email, searchParams.get("userId"), appUser?.id);
    const otherUserId = searchParams.get("otherUserId");
    const type = searchParams.get("type") || "conversations";
    const search = searchParams.get("search") || undefined;

    if (!userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    switch (type) {
      case "self":
        return NextResponse.json(
          {
            currentUser: {
              id: userId,
              tenantId: messagingTenantId,
            },
          },
          { headers: { "Cache-Control": "no-store, max-age=0" } }
        );

      case "conversations":
        const conversations = await service.getConversations(userId);
        return NextResponse.json(
          { conversations, currentUser: { id: userId, tenantId: messagingTenantId } },
          { headers: { "Cache-Control": "no-store, max-age=0" } }
        );

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
        return NextResponse.json(
          { messages, otherUser, currentUser: { id: userId, tenantId: messagingTenantId } },
          { headers: { "Cache-Control": "no-store, max-age=0" } }
        );

      case "broadcasts":
        const broadcasts = await service.getBroadcasts(userId);
        return NextResponse.json({ broadcasts });

      case "unread":
        const unreadCount = await service.getInboxCount(userId);
        return NextResponse.json(
          { unreadCount, currentUser: { id: userId, tenantId: messagingTenantId } },
          { headers: { "Cache-Control": "no-store, max-age=0" } }
        );

      case "available-users":
        const users = await service.getAvailableContacts(userId, search, messagingTenantId || undefined);
        return NextResponse.json(
          { users, currentUser: { id: userId, tenantId: messagingTenantId } },
          { headers: { "Cache-Control": "no-store, max-age=0" } }
        );

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
    const { session, appUser, messagingTenantId } = await resolveCurrentAppUser(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const senderId = await resolveMessageUserId(session.user.email, data.senderId || null, appUser?.id);
    if (!senderId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    data.senderId = senderId;

    if (data.type === "broadcast") {
      const messages = await service.sendBroadcast(data);
      return NextResponse.json({ messages });
    } else {
      const message = await service.sendMessage({ ...data, tenantId: messagingTenantId || undefined });
      return NextResponse.json({ message });
    }
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to send message" }, { status: 500 });
  }
}
