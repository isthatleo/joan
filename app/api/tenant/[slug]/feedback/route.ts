import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, inArray, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { auditLogs, notifications, roles, userRoles, users } from "@/lib/db/schema";
import { feedbackService } from "@/lib/services/feedback.service";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_STATUS = new Set(["open", "in_progress", "resolved", "closed"]);
const VALID_PRIORITY = new Set(["low", "medium", "high", "critical"]);
const PLATFORM_TYPES = new Set(["bug", "feature_request", "feature_improvement", "feature_addition", "improvement", "integration_issue", "platform_billing", "platform_general"]);

function normalizeRole(value?: string | null) {
  const role = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (role === "admin") return "hospital_admin";
  if (role === "lab" || role === "lab_tech") return "lab_technician";
  if (role === "reception") return "receptionist";
  return role;
}

async function resolveCurrentUser(request: NextRequest, tenantId: string) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) return null;

  const tenantScopedUser = await db.query.users.findFirst({
    where: and(eq(users.tenantId, tenantId), ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true, tenantId: true, email: true, fullName: true, role: true },
  });

  if (tenantScopedUser) return tenantScopedUser;

  return db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true, tenantId: true, email: true, fullName: true, role: true },
  });
}

async function resolveWritableAdminUser(request: NextRequest, tenantId: string, admin: any) {
  if (admin?.user?.id) return admin.user;
  const appUser = await resolveCurrentUser(request, tenantId);
  if (appUser) return appUser;

  const sessionUser = admin?.session?.user;
  if (!sessionUser?.email) return null;

  return {
    id: sessionUser.id || null,
    tenantId,
    email: sessionUser.email,
    fullName: sessionUser.name || sessionUser.email,
    role: "hospital_admin",
  };
}

async function getUserRoleMap(userIds: string[]) {
  if (!userIds.length) return new Map<string, string[]>();

  const rows = await db
    .select({ userId: users.id, baseRole: users.role, linkedRole: roles.name })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(inArray(users.id, userIds));

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const current = map.get(row.userId) || [];
    for (const role of [normalizeRole(row.baseRole), normalizeRole(row.linkedRole)].filter(Boolean)) {
      if (!current.includes(role)) current.push(role);
    }
    map.set(row.userId, current);
  }
  return map;
}

async function enrichFeedback(items: any[]) {
  const roleMap = await getUserRoleMap(
    Array.from(new Set(items.map((item) => item.user?.id).filter(Boolean))),
  );

  return items.map((item) => {
    const rolesForUser = roleMap.get(item.user?.id) || [];
    const isCustomer = Boolean(item.patientFeedback) || rolesForUser.some((role) => role === "patient" || role === "guardian");
    return {
      ...item,
      source: isCustomer ? "customer" : "employee",
      submitterRole: rolesForUser[0] || "unknown",
    };
  });
}

function buildStats(serviceItems: any[], platformItems: any[]) {
  const all = [...serviceItems, ...platformItems];
  return {
    total: all.length,
    service: serviceItems.length,
    platform: platformItems.length,
    open: all.filter((item) => item.status === "open").length,
    inProgress: all.filter((item) => item.status === "in_progress").length,
    resolved: all.filter((item) => item.status === "resolved" || item.status === "closed").length,
    customers: serviceItems.filter((item) => item.source === "customer").length,
    employees: serviceItems.filter((item) => item.source === "employee").length,
    critical: all.filter((item) => item.priority === "critical").length,
  };
}

async function notifySuperAdmins(input: {
  feedbackId: string;
  tenantId: string;
  title: string;
  type: string;
  priority: string;
  submitterId: string;
  submitterName: string;
  submitterEmail: string;
}) {
  const rows = await db
    .select({ id: users.id, baseRole: users.role, linkedRole: roles.name })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(users.isActive, true), isNull(users.deletedAt)));

  const recipients = new Set<string>();
  for (const row of rows) {
    if ([normalizeRole(row.baseRole), normalizeRole(row.linkedRole)].includes("super_admin")) {
      recipients.add(row.id);
    }
  }

  if (!recipients.size) return;

  await db.insert(notifications).values(
    Array.from(recipients).map((userId) => ({
      tenantId: null,
      userId,
      type: "platform_feedback",
      title: "Hospital admin feedback",
      message: `${input.submitterName} submitted "${input.title}" for super admin review.`,
      metadata: {
        feedbackId: input.feedbackId,
        tenantId: input.tenantId,
        feedbackType: input.type,
        priority: input.priority,
        submittedBy: input.submitterId,
        submitterEmail: input.submitterEmail,
      },
      read: false,
    })),
  );
}

async function getTenantPayload(request: NextRequest, tenantId: string, currentUserId?: string) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const type = searchParams.get("type") || undefined;
  const source = searchParams.get("source") || "all";
  const view = searchParams.get("view") || "service";

  const serviceFeedback = view !== "platform"
    ? await feedbackService.getFeedback({
        tenantId,
        scope: "tenant",
        status: status === "all" ? undefined : status,
        type: type === "all" ? undefined : type,
      })
    : [];

  const platformFeedback = view !== "service" && currentUserId
    ? await feedbackService.getFeedback({
        tenantId,
        scope: "platform",
        userId: currentUserId,
        status: status === "all" ? undefined : status,
        type: type === "all" ? undefined : type,
      })
    : [];

  const enrichedService = await enrichFeedback(serviceFeedback);
  const enrichedPlatform = await enrichFeedback(platformFeedback);
  const sourceFilteredService = source === "all" ? enrichedService : enrichedService.filter((item) => item.source === source);

  return {
    feedback: view === "platform" ? enrichedPlatform : view === "all" ? [...sourceFilteredService, ...enrichedPlatform] : sourceFilteredService,
    serviceFeedback: sourceFilteredService,
    platformFeedback: enrichedPlatform,
    stats: buildStats(enrichedService, enrichedPlatform),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    return NextResponse.json(await getTenantPayload(request, tenantId, admin.user?.id), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Error fetching tenant feedback:", error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const currentUser = await resolveWritableAdminUser(request, tenantId, admin);
    if (!currentUser) return NextResponse.json({ error: "Hospital admin user profile not found for this tenant." }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const type = String(body.type || "general").trim();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const priority = VALID_PRIORITY.has(String(body.priority)) ? String(body.priority) : "medium";

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
    }

    const normalizedType = PLATFORM_TYPES.has(type) ? type : "general";
    const feedback = await feedbackService.createFeedback({
      userId: currentUser.id,
      tenantId,
      userName: currentUser.fullName || currentUser.email,
      userEmail: currentUser.email,
      type: normalizedType,
      title,
      description,
      priority,
      scope: "platform",
      forcePatientFeedback: false,
    });

    await notifySuperAdmins({
      feedbackId: feedback.id,
      tenantId,
      title,
      type: normalizedType,
      priority,
      submitterId: currentUser.id,
      submitterName: currentUser.fullName || currentUser.email,
      submitterEmail: currentUser.email,
    });

    await db.insert(auditLogs).values({
      tenantId,
      userId: currentUser.id,
      action: "feedback.platform_submitted",
      entity: "feedback",
      entityId: feedback.id,
      metadata: { type: normalizedType, priority },
    }).catch(() => null);

    return NextResponse.json({ success: true, feedback }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating tenant feedback:", error);
    return NextResponse.json({ error: error?.message || "Failed to create feedback" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const currentUser = await resolveWritableAdminUser(request, tenantId, admin);
    if (!currentUser) return NextResponse.json({ error: "Hospital admin user profile not found for this tenant." }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const feedbackId = String(body.feedbackId || "").trim();
    const status = String(body.status || "").trim();
    const resolution = String(body.resolution || "").trim();

    if (!feedbackId || !VALID_STATUS.has(status)) {
      return NextResponse.json({ error: "A valid feedback ID and status are required." }, { status: 400 });
    }

    const access = await feedbackService.getFeedbackAccess(feedbackId);
    if (!access || access.tenantId !== tenantId || access.scope !== "tenant") {
      return NextResponse.json({ error: "Only tenant service feedback can be managed here." }, { status: 403 });
    }

    const updated = await feedbackService.updateFeedbackStatus(
      feedbackId,
      status,
      body.assignedTo === "me" ? currentUser.id || "" : String(body.assignedTo || ""),
      resolution,
    );

    await db.insert(auditLogs).values({
      tenantId,
      userId: currentUser.id || null,
      action: "feedback.service_updated",
      entity: "feedback",
      entityId: feedbackId,
      metadata: { status, resolution: Boolean(resolution) },
    }).catch(() => null);

    return NextResponse.json({ success: true, feedback: updated });
  } catch (error: any) {
    console.error("Error updating tenant feedback:", error);
    return NextResponse.json({ error: error?.message || "Failed to update feedback" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const currentUser = await resolveWritableAdminUser(request, tenantId, admin);
    if (!currentUser) return NextResponse.json({ error: "Hospital admin user profile not found for this tenant." }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const feedbackId = searchParams.get("feedbackId");
    if (!feedbackId) return NextResponse.json({ error: "feedbackId is required." }, { status: 400 });

    const access = await feedbackService.getFeedbackAccess(feedbackId);
    if (!access || access.tenantId !== tenantId) return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    if (access.scope === "platform" && access.userId !== currentUser.id) {
      return NextResponse.json({ error: "Only your own platform feedback can be deleted." }, { status: 403 });
    }

    await feedbackService.deleteFeedback(feedbackId);
    await db.insert(auditLogs).values({
      tenantId,
      userId: currentUser.id,
      action: "feedback.deleted",
      entity: "feedback",
      entityId: feedbackId,
      metadata: { scope: access.scope },
    }).catch(() => null);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting tenant feedback:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete feedback" }, { status: 500 });
  }
}
