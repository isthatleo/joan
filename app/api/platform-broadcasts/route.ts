import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { auditLogs, notifications, roles, tenants, userRoles, users } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/platform-billing";

export const dynamic = "force-dynamic";

const broadcastSchema = z.object({
  title: z.string().trim().min(2).max(180),
  message: z.string().trim().min(2).max(5000),
  category: z.enum(["bug_fix", "update", "maintenance", "feature", "security", "general"]).default("general"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  audience: z.enum(["all_dashboards", "hospital_admins"]).default("hospital_admins"),
  status: z.enum(["draft", "sent"]).default("sent"),
});

function meta(row: typeof notifications.$inferSelect) {
  return (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, any>;
}

async function getRecipients(audience: "all_dashboards" | "hospital_admins", senderId: string) {
  if (audience === "all_dashboards") {
    return db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        fullName: users.fullName,
      })
      .from(users)
      .leftJoin(tenants, eq(tenants.id, users.tenantId))
      .where(and(eq(users.isActive, true), isNull(users.deletedAt), isNull(tenants.deletedAt), eq(tenants.isActive, true)))
      .then((rows) => rows.filter((row) => row.id !== senderId));
  }

  const rows = await db
    .select({
      id: users.id,
      tenantId: users.tenantId,
      email: users.email,
      fullName: users.fullName,
      baseRole: users.role,
      linkedRole: roles.name,
      tenantAdminUserId: tenants.adminUserId,
    })
    .from(users)
    .leftJoin(tenants, eq(tenants.id, users.tenantId))
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(users.isActive, true), isNull(users.deletedAt), isNull(tenants.deletedAt), eq(tenants.isActive, true)));

  const recipientMap = new Map<string, typeof rows[number]>();
  for (const row of rows) {
    if (row.id === senderId) continue;
    const roleNames = [row.baseRole, row.linkedRole].filter(Boolean).map((role) => String(role).toLowerCase());
    if (roleNames.includes("hospital_admin") || roleNames.includes("admin") || row.tenantAdminUserId === row.id) {
      recipientMap.set(row.id, row);
    }
  }
  return Array.from(recipientMap.values());
}

async function deliver(input: {
  broadcastId: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  audience: "all_dashboards" | "hospital_admins";
  senderId: string;
  senderName: string;
}) {
  const recipients = await getRecipients(input.audience, input.senderId);
  if (!recipients.length) return { recipientCount: 0 };

  await db.insert(notifications).values(
    recipients.map((recipient) => ({
      tenantId: recipient.tenantId || null,
      userId: recipient.id,
      type: "platform_broadcast",
      title: input.title,
      message: input.message,
      metadata: {
        broadcastId: input.broadcastId,
        category: input.category,
        priority: input.priority,
        audience: input.audience,
        sentAt: new Date().toISOString(),
        createdBy: { id: input.senderId, name: input.senderName, role: "super_admin" },
      },
      read: false,
    })),
  );
  return { recipientCount: recipients.length };
}

async function getRows() {
  const rows = await db.query.notifications.findMany({
    where: and(inArray(notifications.type, ["platform_broadcast_record", "platform_broadcast"]), isNull(notifications.deletedAt)),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    limit: 1000,
  });

  const grouped = new Map<string, any>();
  for (const row of rows) {
    const data = meta(row);
    const broadcastId = String(data.broadcastId || row.id);
    const current = grouped.get(broadcastId) || {
      id: broadcastId,
      recordId: "",
      title: row.title || "Broadcast",
      message: row.message || "",
      category: data.category || "general",
      priority: data.priority || "normal",
      audience: data.audience || "hospital_admins",
      status: data.status || (row.type === "platform_broadcast" ? "sent" : "draft"),
      sentAt: data.sentAt || "",
      recipientCount: 0,
      readCount: 0,
      createdBy: data.createdBy || null,
      createdAt: row.createdAt,
    };

    if (row.type === "platform_broadcast_record") {
      Object.assign(current, {
        recordId: row.id,
        title: row.title || current.title,
        message: row.message || current.message,
        category: data.category || current.category,
        priority: data.priority || current.priority,
        audience: data.audience || current.audience,
        status: data.status || current.status,
        sentAt: data.sentAt || current.sentAt,
        recipientCount: Number(data.recipientCount || current.recipientCount || 0),
        createdBy: data.createdBy || current.createdBy,
        createdAt: row.createdAt || current.createdAt,
      });
    } else {
      current.recipientCount += 1;
      if (row.read) current.readCount += 1;
      current.status = "sent";
      current.sentAt = current.sentAt || data.sentAt || row.createdAt;
    }
    grouped.set(broadcastId, current);
  }
  return Array.from(grouped.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function stats(rows: any[]) {
  const totalReach = rows.reduce((sum, row) => sum + Number(row.recipientCount || 0), 0);
  const totalReads = rows.reduce((sum, row) => sum + Number(row.readCount || 0), 0);
  return {
    total: rows.length,
    sent: rows.filter((row) => row.status === "sent").length,
    drafts: rows.filter((row) => row.status === "draft").length,
    totalReach,
    readRate: totalReach ? Math.round((totalReads / totalReach) * 100) : 0,
  };
}

export async function GET(request: NextRequest) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;
  const rows = await getRows();
  return NextResponse.json({ broadcasts: rows, stats: stats(rows) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => ({}));
  const parsed = broadcastSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid broadcast", details: parsed.error.issues }, { status: 400 });
  }

  const broadcastId = crypto.randomUUID();
  const senderName = access.user.fullName || access.user.email;
  let recipientCount = 0;
  let sentAt = "";
  if (parsed.data.status === "sent") {
    const result = await deliver({ ...parsed.data, broadcastId, senderId: access.user.id, senderName });
    recipientCount = result.recipientCount;
    sentAt = new Date().toISOString();
  } else {
    recipientCount = (await getRecipients(parsed.data.audience, access.user.id)).length;
  }

  const [record] = await db.insert(notifications).values({
    tenantId: null,
    userId: access.user.id,
    type: "platform_broadcast_record",
    title: parsed.data.title,
    message: parsed.data.message,
    metadata: {
      broadcastId,
      category: parsed.data.category,
      priority: parsed.data.priority,
      audience: parsed.data.audience,
      status: parsed.data.status,
      recipientCount,
      sentAt,
      createdBy: { id: access.user.id, name: senderName, role: "super_admin" },
    },
    read: true,
  }).returning();

  await db.insert(auditLogs).values({
    userId: access.user.id,
    action: parsed.data.status === "sent" ? "platform_broadcast.sent" : "platform_broadcast.created",
    entity: "platform_broadcast",
    entityId: record.id,
    metadata: { broadcastId, audience: parsed.data.audience, recipientCount },
  }).catch(() => null);

  return NextResponse.json({ success: true, broadcastId, recipientCount, broadcast: record }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => ({}));
  const broadcastId = String(body.broadcastId || "");
  const action = String(body.action || "");
  if (!broadcastId || !action) return NextResponse.json({ error: "broadcastId and action are required" }, { status: 400 });

  const records = await db.query.notifications.findMany({
    where: and(eq(notifications.type, "platform_broadcast_record"), isNull(notifications.deletedAt)),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
  const record = records.find((item) => meta(item).broadcastId === broadcastId);
  if (!record) return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
  const data = meta(record);

  if (action === "send") {
    const senderName = access.user.fullName || access.user.email;
    const result = await deliver({
      broadcastId,
      title: record.title || "Broadcast",
      message: record.message || "",
      category: data.category || "general",
      priority: data.priority || "normal",
      audience: data.audience === "all_dashboards" ? "all_dashboards" : "hospital_admins",
      senderId: access.user.id,
      senderName,
    });
    await db.update(notifications).set({
      metadata: { ...data, status: "sent", sentAt: new Date().toISOString(), recipientCount: result.recipientCount },
      updatedAt: new Date(),
    }).where(eq(notifications.id, record.id));
    return NextResponse.json({ success: true, recipientCount: result.recipientCount });
  }

  if (action === "delete") {
    const now = new Date();
    await db.update(notifications).set({ deletedAt: now, updatedAt: now }).where(eq(notifications.id, record.id));
    const deliveries = await db.query.notifications.findMany({
      where: and(eq(notifications.type, "platform_broadcast"), isNull(notifications.deletedAt)),
      columns: { id: true, metadata: true },
    });
    const deliveryIds = deliveries.filter((item) => meta(item as any).broadcastId === broadcastId).map((item) => item.id);
    if (deliveryIds.length) {
      await db.update(notifications).set({ deletedAt: now, updatedAt: now }).where(inArray(notifications.id, deliveryIds));
    }
    return NextResponse.json({ success: true });
  }

  if (action === "mark_read") {
    await db.execute(sql`
      UPDATE notifications
      SET read = true, updated_at = now()
      WHERE type = 'platform_broadcast'
        AND metadata->>'broadcastId' = ${broadcastId}
    `);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
