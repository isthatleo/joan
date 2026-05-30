import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roles, tenants, userRoles, users } from "@/lib/db/schema";
import { MessagingService } from "@/lib/services/messaging.service";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { getTenantSubdomain } from "@/lib/tenant-routing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const service = new MessagingService();

async function resolveTenantId(request: NextRequest, slug: string, sessionEmail: string) {
  const directTenantId = await getTenantIdBySlug(slug);
  if (directTenantId) return directTenantId;

  const hostSlug = getTenantSubdomain(request.headers.get("host"));
  if (hostSlug && hostSlug !== slug) {
    const hostTenantId = await getTenantIdBySlug(hostSlug);
    if (hostTenantId) return hostTenantId;
  }

  const appUser = await db.query.users.findFirst({
    where: and(ilike(users.email, sessionEmail), eq(users.isActive, true), isNull(users.deletedAt)),
    columns: { id: true, tenantId: true },
  });
  if (appUser?.tenantId) return appUser.tenantId;

  if (appUser?.id) {
    const adminTenant = await db.query.tenants.findFirst({
      where: eq(tenants.adminUserId, appUser.id),
      columns: { id: true },
    });
    if (adminTenant?.id) return adminTenant.id;
  }

  return null;
}

async function resolveTenantUser(request: NextRequest, sessionEmail: string, slug: string) {
  const tenantId = await resolveTenantId(request, slug, sessionEmail);
  if (!tenantId) return null;

  const [tenant, appUser] = await Promise.all([
    db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { id: true, adminUserId: true },
    }),
    db.query.users.findFirst({
      where: and(ilike(users.email, sessionEmail), eq(users.isActive, true), isNull(users.deletedAt)),
      columns: { id: true, tenantId: true, role: true },
    }),
  ]);

  if (!tenant || !appUser) return null;

  if (appUser.tenantId === tenantId || tenant.adminUserId === appUser.id) {
    return { id: appUser.id, tenantId };
  }

  const roleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(userRoles.userId, appUser.id), eq(roles.tenantId, tenantId)))
    .catch(() => []);

  const normalizedRoles = roleRows.map((row) => String(row.roleName || "").trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const baseRole = String(appUser.role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalizedRoles.includes("hospital_admin") || normalizedRoles.includes("admin") || baseRole === "hospital_admin" || baseRole === "admin") {
    return { id: appUser.id, tenantId };
  }

  const superAdminRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(userRoles.userId, appUser.id), eq(roles.name, "super_admin")))
    .limit(1)
    .catch(() => []);
  if (superAdminRows.length || baseRole === "super_admin") {
    return { id: appUser.id, tenantId };
  }

  return null;
}

async function getTenantParticipant(tenantId: string, otherUserId: string) {
  const participant = await db.query.users.findFirst({
    where: and(eq(users.id, otherUserId), eq(users.isActive, true), isNull(users.deletedAt)),
    columns: { id: true, tenantId: true, fullName: true, email: true, avatar: true, role: true },
  });

  if (!participant) return null;
  if (participant.tenantId === tenantId) return participant;

  const superAdminRole = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(userRoles.userId, participant.id), eq(roles.name, "super_admin")))
    .limit(1)
    .catch(() => []);

  if (superAdminRole.length || String(participant.role || "").toLowerCase() === "super_admin") return participant;
  return null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const currentUser = await resolveTenantUser(request, session.user.email, slug);
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
        const messages = await service.getChatMessages(currentUser.id, otherUserId, currentUser.tenantId);
        let otherUser = null;
        if (messages.length === 0) {
          otherUser = await getTenantParticipant(currentUser.tenantId, otherUserId);
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
        const availableUsers = await service.getAvailableContacts(currentUser.id, search, currentUser.tenantId);
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
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const currentUser = await resolveTenantUser(request, session.user.email, slug);
    if (!currentUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const data = await request.json().catch(() => ({}));
    if (!data.receiverId || !String(data.message || "").trim()) {
      return NextResponse.json({ error: "receiverId and message are required" }, { status: 400 });
    }
    data.senderId = currentUser.id;

    if (data.type === "broadcast") {
      const messages = await service.sendBroadcast(data);
      return NextResponse.json({ messages });
    }

    const message = await service.sendMessage({ ...data, tenantId: currentUser.tenantId });
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to send message" }, { status: 500 });
  }
}
