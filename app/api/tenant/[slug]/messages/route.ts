import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { MessagingService } from "@/lib/services/messaging.service";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { getTenantIdBySlug } from "@/lib/accountant/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const service = new MessagingService();

async function resolveTenantUser(sessionEmail: string, slug: string) {
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) return null;
  const currentUser = await db.query.users.findFirst({
    where: and(eq(users.tenantId, tenantId), ilike(users.email, sessionEmail), isNull(users.deletedAt)),
    columns: { id: true, tenantId: true },
  });

  if (!currentUser) return null;
  if (currentUser.tenantId !== tenantId) return null;
  return currentUser;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const currentUser = await resolveTenantUser(session.user.email, slug);
    if (!currentUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "conversations";
    const otherUserId = searchParams.get("otherUserId");
    const search = searchParams.get("search") || undefined;

    switch (type) {
      case "self": {
        return NextResponse.json(
          {
            currentUser: {
              id: currentUser.id,
              tenantId: currentUser.tenantId,
            },
          },
          { headers: { "Cache-Control": "no-store, max-age=0" } }
        );
      }
      case "conversations": {
        const conversations = await service.getConversations(currentUser.id);
        return NextResponse.json(
          {
            conversations,
            currentUser: {
              id: currentUser.id,
              tenantId: currentUser.tenantId,
            },
          },
          { headers: { "Cache-Control": "no-store, max-age=0" } }
        );
      }
      case "chat": {
        if (!otherUserId) {
          return NextResponse.json({ error: "Other user ID required" }, { status: 400 });
        }
        const messages = await service.getChatMessages(currentUser.id, otherUserId);
        let otherUser = null;
        if (messages.length === 0) {
          otherUser = await db.query.users.findFirst({
            where: and(eq(users.id, otherUserId), isNull(users.deletedAt)),
            columns: { id: true, fullName: true, email: true, avatar: true, role: true },
          });
        }
        return NextResponse.json(
          {
            messages,
            otherUser,
            currentUser: {
              id: currentUser.id,
              tenantId: currentUser.tenantId,
            },
          },
          { headers: { "Cache-Control": "no-store, max-age=0" } }
        );
      }
      case "available-users": {
        const availableUsers = await service.getAvailableContacts(currentUser.id, search);
        return NextResponse.json(
          {
            users: availableUsers,
            currentUser: {
              id: currentUser.id,
              tenantId: currentUser.tenantId,
            },
          },
          { headers: { "Cache-Control": "no-store, max-age=0" } }
        );
      }
      case "unread": {
        const unreadCount = await service.getInboxCount(currentUser.id);
        return NextResponse.json(
          {
            unreadCount,
            currentUser: {
              id: currentUser.id,
              tenantId: currentUser.tenantId,
            },
          },
          { headers: { "Cache-Control": "no-store, max-age=0" } }
        );
      }
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const currentUser = await resolveTenantUser(session.user.email, slug);
    if (!currentUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const data = await request.json();
    data.senderId = currentUser.id;

    if (data.type === "broadcast") {
      const messages = await service.sendBroadcast(data);
      return NextResponse.json({ messages });
    }

    const message = await service.sendMessage(data);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to send message" }, { status: 500 });
  }
}
