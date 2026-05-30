import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, inArray, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { auditLogs, notifications, roles, userRoles, users } from "@/lib/db/schema";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_TYPES = new Set(["announcement", "memo", "alert", "reminder", "update", "flyer", "poster"]);
const VALID_PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const VALID_STATUSES = new Set(["draft", "scheduled", "sent", "cancelled"]);

const TARGET_ROLE_MAP: Record<string, string[]> = {
  all_staff: ["hospital_admin", "doctor", "nurse", "lab_technician", "pharmacist", "accountant", "receptionist"],
  clinical: ["doctor", "nurse", "lab_technician", "pharmacist"],
  administration: ["hospital_admin", "accountant", "receptionist"],
  doctors: ["doctor"],
  nurses: ["nurse"],
  lab: ["lab_technician"],
  pharmacy: ["pharmacist"],
  accountants: ["accountant"],
  reception: ["receptionist"],
  patients: ["patient"],
  guardians: ["guardian"],
  all_users: ["hospital_admin", "doctor", "nurse", "lab_technician", "pharmacist", "accountant", "receptionist", "patient", "guardian"],
};

function normalizeRole(value?: string | null) {
  const role = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (role === "admin" || role === "hospitaladmin") return "hospital_admin";
  if (role === "lab" || role === "lab_tech") return "lab_technician";
  if (role === "reception") return "receptionist";
  return role;
}

function normalizeStatus(value?: string | null) {
  const status = String(value || "all").trim().toLowerCase();
  return status === "drafts" ? "draft" : status;
}

function getMeta(row: typeof notifications.$inferSelect) {
  return (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, any>;
}

function cleanAudience(value: unknown) {
  const audience = Array.isArray(value) ? value.map(String) : ["all_staff"];
  const cleaned = audience.map((item) => item.trim()).filter((item) => TARGET_ROLE_MAP[item]);
  return cleaned.length ? Array.from(new Set(cleaned)) : ["all_staff"];
}

async function resolveCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) return null;
  return db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true, email: true, fullName: true, role: true },
  });
}

async function getRecipients(tenantId: string, targetAudience: string[], creatorId: string) {
  const targetRoles = new Set<string>();
  for (const audience of targetAudience.length ? targetAudience : ["all_staff"]) {
    for (const role of TARGET_ROLE_MAP[audience] || []) targetRoles.add(role);
  }
  if (!targetRoles.size) return [];

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      baseRole: users.role,
      linkedRole: roles.name,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true), isNull(users.deletedAt)));

  const recipients = new Map<string, typeof rows[number]>();
  for (const row of rows) {
    if (row.id === creatorId) continue;
    const userRolesForRow = [normalizeRole(row.baseRole), normalizeRole(row.linkedRole)].filter(Boolean);
    if (userRolesForRow.some((role) => targetRoles.has(role))) recipients.set(row.id, row);
  }

  return Array.from(recipients.values());
}

async function createRecipientNotifications(input: {
  tenantId: string;
  broadcastId: string;
  title: string;
  message: string;
  broadcastType: string;
  priority: string;
  targetAudience: string[];
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  creatorId: string;
  creatorName: string;
}) {
  const recipients = await getRecipients(input.tenantId, input.targetAudience, input.creatorId);
  if (!recipients.length) return { recipientCount: 0 };

  const existing = await db.query.notifications.findMany({
    where: and(eq(notifications.tenantId, input.tenantId), eq(notifications.type, "broadcast"), isNull(notifications.deletedAt)),
    columns: { userId: true, metadata: true },
  });
  const alreadyDelivered = new Set(
    existing
      .filter((row) => ((row.metadata || {}) as Record<string, any>).broadcastId === input.broadcastId)
      .map((row) => row.userId)
      .filter(Boolean),
  );
  const pending = recipients.filter((recipient) => !alreadyDelivered.has(recipient.id));
  if (!pending.length) return { recipientCount: recipients.length };

  await db.insert(notifications).values(
    pending.map((recipient) => ({
      tenantId: input.tenantId,
      userId: recipient.id,
      type: "broadcast",
      title: input.title,
      message: input.message,
      metadata: {
        broadcastId: input.broadcastId,
        broadcastType: input.broadcastType,
        priority: input.priority,
        targetAudience: input.targetAudience,
        attachmentUrl: input.attachmentUrl || "",
        attachmentName: input.attachmentName || "",
        attachmentType: input.attachmentType || "",
        sentAt: new Date().toISOString(),
        createdBy: { id: input.creatorId, name: input.creatorName, role: "hospital_admin" },
      },
      read: false,
    })),
  );

  return { recipientCount: recipients.length };
}

async function getBroadcastRows(tenantId: string) {
  const rows = await db.query.notifications.findMany({
    where: and(eq(notifications.tenantId, tenantId), inArray(notifications.type, ["broadcast_record", "broadcast"]), isNull(notifications.deletedAt)),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  const grouped = new Map<string, any>();
  for (const row of rows) {
    const meta = getMeta(row);
    const broadcastId = String(meta.broadcastId || row.id);
    const current = grouped.get(broadcastId) || {
      id: broadcastId,
      recordId: row.type === "broadcast_record" ? row.id : "",
      title: row.title || meta.title || "Broadcast",
      message: row.message || meta.message || "",
      type: meta.broadcastType || meta.type || "announcement",
      priority: meta.priority || "normal",
      targetAudience: Array.isArray(meta.targetAudience) ? meta.targetAudience : [],
      status: meta.status || (row.type === "broadcast" ? "sent" : "draft"),
      scheduledFor: meta.scheduledFor || "",
      sentAt: meta.sentAt || "",
      attachmentUrl: meta.attachmentUrl || "",
      attachmentName: meta.attachmentName || "",
      attachmentType: meta.attachmentType || "",
      recipientCount: 0,
      readCount: 0,
      createdBy: meta.createdBy || { id: "", name: "Hospital Admin", role: "hospital_admin" },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    if (row.type === "broadcast_record") {
      Object.assign(current, {
        recordId: row.id,
        title: row.title || meta.title || current.title,
        message: row.message || meta.message || current.message,
        type: meta.broadcastType || current.type,
        priority: meta.priority || current.priority,
        targetAudience: Array.isArray(meta.targetAudience) ? meta.targetAudience : current.targetAudience,
        status: meta.status || current.status,
        scheduledFor: meta.scheduledFor || current.scheduledFor,
        sentAt: meta.sentAt || current.sentAt,
        attachmentUrl: meta.attachmentUrl || current.attachmentUrl,
        attachmentName: meta.attachmentName || current.attachmentName,
        attachmentType: meta.attachmentType || current.attachmentType,
        createdBy: meta.createdBy || current.createdBy,
        createdAt: row.createdAt || current.createdAt,
        updatedAt: row.updatedAt || current.updatedAt,
      });
    } else {
      current.recipientCount += 1;
      if (row.read) current.readCount += 1;
      current.sentAt = current.sentAt || meta.sentAt || row.createdAt;
      if (current.status !== "cancelled") current.status = "sent";
    }

    grouped.set(broadcastId, current);
  }

  const broadcasts = Array.from(grouped.values());
  for (const broadcast of broadcasts) {
    if (broadcast.recordId && broadcast.status !== "sent") {
      const recipients = await getRecipients(tenantId, broadcast.targetAudience, broadcast.createdBy?.id || "");
      broadcast.recipientCount = recipients.length;
    }
  }

  return broadcasts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function publishDueScheduledBroadcasts(tenantId: string) {
  const records = await db.query.notifications.findMany({
    where: and(eq(notifications.tenantId, tenantId), eq(notifications.type, "broadcast_record"), isNull(notifications.deletedAt)),
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  const now = Date.now();
  for (const record of records) {
    const meta = getMeta(record);
    if (meta.status !== "scheduled" || !meta.scheduledFor) continue;
    const scheduledAt = new Date(meta.scheduledFor).getTime();
    if (Number.isNaN(scheduledAt) || scheduledAt > now) continue;

    const creatorId = String(meta.createdBy?.id || record.userId || "");
    if (!creatorId) continue;

    const result = await createRecipientNotifications({
      tenantId,
      broadcastId: String(meta.broadcastId || record.id),
      title: record.title || "Broadcast",
      message: record.message || "",
      broadcastType: meta.broadcastType || "announcement",
      priority: meta.priority || "normal",
      targetAudience: cleanAudience(meta.targetAudience),
      attachmentUrl: meta.attachmentUrl || "",
      attachmentName: meta.attachmentName || "",
      attachmentType: meta.attachmentType || "",
      creatorId,
      creatorName: String(meta.createdBy?.name || "Hospital Admin"),
    });

    await db.update(notifications).set({
      metadata: { ...meta, status: "sent", sentAt: new Date().toISOString(), recipientCount: result.recipientCount },
      updatedAt: new Date(),
    }).where(eq(notifications.id, record.id));
  }
}

function buildStats(broadcasts: any[]) {
  const totalReach = broadcasts.reduce((sum, item) => sum + Number(item.recipientCount || 0), 0);
  const totalReads = broadcasts.reduce((sum, item) => sum + Number(item.readCount || 0), 0);
  return {
    total: broadcasts.length,
    sent: broadcasts.filter((item) => item.status === "sent").length,
    scheduled: broadcasts.filter((item) => item.status === "scheduled").length,
    drafts: broadcasts.filter((item) => item.status === "draft").length,
    totalReach,
    readRate: totalReach ? Math.round((totalReads / totalReach) * 100) : 0,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    await publishDueScheduledBroadcasts(tenantId);

    const { searchParams } = new URL(request.url);
    const status = normalizeStatus(searchParams.get("status"));
    const kind = String(searchParams.get("type") || "all");
    const allBroadcasts = await getBroadcastRows(tenantId);
    const broadcasts = allBroadcasts.filter((item) => {
      const statusMatches = status === "all" || item.status === status;
      const kindMatches = kind === "all" || item.type === kind;
      return statusMatches && kindMatches;
    });

    return NextResponse.json(
      { broadcasts, stats: buildStats(allBroadcasts) },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Error fetching broadcasts:", error);
    return NextResponse.json({ error: "Failed to fetch broadcasts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const currentUser = await resolveCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const title = String(body.title || "").trim();
    const message = String(body.message || "").trim();
    const broadcastType = VALID_TYPES.has(String(body.type)) ? String(body.type) : "announcement";
    const priority = VALID_PRIORITIES.has(String(body.priority)) ? String(body.priority) : "normal";
    const status = VALID_STATUSES.has(String(body.status)) ? String(body.status) : "draft";
    const targetAudience = cleanAudience(body.targetAudience);
    const scheduledFor = String(body.scheduledFor || "").trim();

    if (!title || !message) return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
    if (status === "scheduled" && !scheduledFor) return NextResponse.json({ error: "Scheduled broadcasts require a date and time." }, { status: 400 });

    const broadcastId = crypto.randomUUID();
    const creatorName = currentUser.fullName || currentUser.email;
    const recipientPreview = await getRecipients(tenantId, targetAudience, currentUser.id);
    let sentAt = "";
    let recipientCount = recipientPreview.length;

    if (status === "sent") {
      const result = await createRecipientNotifications({
        tenantId,
        broadcastId,
        title,
        message,
        broadcastType,
        priority,
        targetAudience,
        attachmentUrl: String(body.attachmentUrl || ""),
        attachmentName: String(body.attachmentName || ""),
        attachmentType: String(body.attachmentType || ""),
        creatorId: currentUser.id,
        creatorName,
      });
      recipientCount = result.recipientCount;
      sentAt = new Date().toISOString();
    }

    const metadata = {
      broadcastId,
      broadcastType,
      priority,
      targetAudience,
      status,
      scheduledFor,
      sentAt,
      recipientCount,
      readCount: 0,
      attachmentUrl: String(body.attachmentUrl || ""),
      attachmentName: String(body.attachmentName || ""),
      attachmentType: String(body.attachmentType || ""),
      createdBy: { id: currentUser.id, name: creatorName, role: "hospital_admin" },
    };

    const [record] = await db.insert(notifications).values({
      tenantId,
      userId: currentUser.id,
      type: "broadcast_record",
      title,
      message,
      metadata,
      read: true,
    }).returning();

    await db.insert(auditLogs).values({
      tenantId,
      userId: currentUser.id,
      action: status === "sent" ? "broadcast.sent" : "broadcast.created",
      entity: "broadcast",
      entityId: record.id,
      metadata: { broadcastId, status, targetAudience, recipientCount },
    }).catch(() => null);

    return NextResponse.json({ success: true, broadcastId, recipientCount, broadcast: { id: broadcastId, recordId: record.id, title, message, ...metadata } }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating broadcast:", error);
    return NextResponse.json({ error: error?.message || "Failed to create broadcast" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const currentUser = await resolveCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const broadcastId = String(body.broadcastId || "").trim();
    const action = String(body.action || "").trim();
    if (!broadcastId || !action) return NextResponse.json({ error: "broadcastId and action are required." }, { status: 400 });

    const records = await db.query.notifications.findMany({
      where: and(eq(notifications.tenantId, tenantId), eq(notifications.type, "broadcast_record"), isNull(notifications.deletedAt)),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
    const record = records.find((item) => getMeta(item).broadcastId === broadcastId);
    if (!record) return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });

    const meta = getMeta(record);
    if (action === "send") {
      if (meta.status === "cancelled") return NextResponse.json({ error: "Cancelled broadcasts cannot be sent." }, { status: 400 });
      const creatorName = currentUser.fullName || currentUser.email;
      const result = await createRecipientNotifications({
        tenantId,
        broadcastId,
        title: record.title || "Broadcast",
        message: record.message || "",
        broadcastType: meta.broadcastType || "announcement",
        priority: meta.priority || "normal",
        targetAudience: cleanAudience(meta.targetAudience),
        attachmentUrl: meta.attachmentUrl || "",
        attachmentName: meta.attachmentName || "",
        attachmentType: meta.attachmentType || "",
        creatorId: currentUser.id,
        creatorName,
      });
      await db.update(notifications).set({
        metadata: { ...meta, status: "sent", sentAt: new Date().toISOString(), recipientCount: result.recipientCount },
        updatedAt: new Date(),
      }).where(eq(notifications.id, record.id));
      await db.insert(auditLogs).values({ tenantId, userId: currentUser.id, action: "broadcast.sent", entity: "broadcast", entityId: record.id, metadata: { broadcastId, recipientCount: result.recipientCount } }).catch(() => null);
      return NextResponse.json({ success: true, recipientCount: result.recipientCount });
    }

    if (action === "cancel") {
      await db.update(notifications).set({ metadata: { ...meta, status: "cancelled" }, updatedAt: new Date() }).where(eq(notifications.id, record.id));
      await db.insert(auditLogs).values({ tenantId, userId: currentUser.id, action: "broadcast.cancelled", entity: "broadcast", entityId: record.id, metadata: { broadcastId } }).catch(() => null);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const now = new Date();
      await db.update(notifications).set({ deletedAt: now, updatedAt: now }).where(eq(notifications.id, record.id));
      const deliveries = await db.query.notifications.findMany({
        where: and(eq(notifications.tenantId, tenantId), eq(notifications.type, "broadcast"), isNull(notifications.deletedAt)),
        columns: { id: true, metadata: true },
      });
      const deliveryIds = deliveries.filter((item) => ((item.metadata || {}) as Record<string, any>).broadcastId === broadcastId).map((item) => item.id);
      if (deliveryIds.length) {
        await db.update(notifications).set({ deletedAt: now, updatedAt: now }).where(inArray(notifications.id, deliveryIds));
      }
      await db.insert(auditLogs).values({ tenantId, userId: currentUser.id, action: "broadcast.deleted", entity: "broadcast", entityId: record.id, metadata: { broadcastId } }).catch(() => null);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error updating broadcast:", error);
    return NextResponse.json({ error: error?.message || "Failed to update broadcast" }, { status: 500 });
  }
}
