import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications, roles, userRoles, users } from "@/lib/db/schema";
import { FeedbackService } from "@/lib/services/feedback.service";

const service = new FeedbackService();

async function resolveCurrentAppUser(request: NextRequest, requestedTenantId?: string | null) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) return null;

  if (requestedTenantId) {
    const tenantUser = await db.query.users.findFirst({
      where: and(
        eq(users.tenantId, requestedTenantId),
        ilike(users.email, session.user.email),
        isNull(users.deletedAt)
      ),
      columns: {
        id: true,
        tenantId: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    if (tenantUser) return tenantUser;
  }

  return db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: {
      id: true,
      tenantId: true,
      email: true,
      fullName: true,
      role: true,
    },
  });
}

async function notifyFeedbackRecipients(options: {
  feedbackId: string;
  feedbackType: string;
  feedbackTitle: string;
  priority: string;
  scope: string;
  submitterId: string;
  submitterName: string;
  submitterEmail: string;
  tenantId?: string | null;
}) {
  const recipientRows = await db
    .select({
      id: users.id,
      tenantId: users.tenantId,
      baseRole: users.role,
      linkedRole: roles.name,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(users.isActive, true), isNull(users.deletedAt)));

  const recipientMap = new Map<string, { tenantId: string | null }>();

  for (const row of recipientRows) {
    const roleNames = [row.baseRole, row.linkedRole]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    if (
      options.scope === "platform" &&
      roleNames.includes("super_admin")
    ) {
      recipientMap.set(row.id, { tenantId: row.tenantId ?? null });
    }

    if (
      options.scope === "tenant" &&
      options.tenantId &&
      row.tenantId === options.tenantId &&
      (roleNames.includes("hospital_admin") || roleNames.includes("admin"))
    ) {
      recipientMap.set(row.id, { tenantId: row.tenantId ?? null });
    }
  }

  if (recipientMap.size === 0) return;

  const title =
    options.scope === "platform"
      ? "Platform feedback requires review"
      : "Tenant service feedback submitted";

  const message =
    options.scope === "platform"
      ? `${options.submitterName} reported "${options.feedbackTitle}" for platform review.`
      : `${options.submitterName} submitted "${options.feedbackTitle}" for tenant follow-up.`;

  await db.insert(notifications).values(
    Array.from(recipientMap.entries()).map(([userId, meta]) => ({
      tenantId: options.scope === "tenant" ? meta.tenantId : null,
      userId,
      type: options.scope === "platform" ? "platform_feedback" : "tenant_feedback",
      title,
      message,
      metadata: {
        feedbackId: options.feedbackId,
        feedbackType: options.feedbackType,
        feedbackScope: options.scope,
        priority: options.priority,
        submittedBy: options.submitterId,
        submitterEmail: options.submitterEmail,
        tenantId: options.tenantId ?? null,
      },
      read: false,
    }))
  );
}

async function notifyFeedbackSubmitter(options: {
  feedbackId: string;
  feedbackTitle: string;
  feedbackType: string;
  feedbackScope: string;
  feedbackOwnerId?: string | null;
  tenantId?: string | null;
  updatedById: string;
  updatedByName: string;
  status?: string;
  resolution?: string;
}) {
  if (!options.feedbackOwnerId || options.feedbackOwnerId === options.updatedById) return;

  const statusLabel = options.status ? options.status.replaceAll("_", " ") : "updated";
  const message = options.resolution
    ? `${options.updatedByName} marked "${options.feedbackTitle}" as ${statusLabel} and added a resolution update.`
    : `${options.updatedByName} updated "${options.feedbackTitle}" to ${statusLabel}.`;

  await db.insert(notifications).values({
    tenantId: options.feedbackScope === "tenant" ? options.tenantId ?? null : null,
    userId: options.feedbackOwnerId,
    type: "feedback_updated",
    title: "Feedback update",
    message,
    metadata: {
      feedbackId: options.feedbackId,
      feedbackType: options.feedbackType,
      feedbackScope: options.feedbackScope,
      status: options.status ?? null,
      resolution: options.resolution ?? null,
      updatedBy: options.updatedById,
      tenantId: options.tenantId ?? null,
    },
    read: false,
  });
}

function canManageFeedback(currentUser: Awaited<ReturnType<typeof resolveCurrentAppUser>>, feedback: Awaited<ReturnType<FeedbackService["getFeedbackAccess"]>>) {
  if (!currentUser || !feedback) return false;
  if (currentUser.role === "super_admin") return true;
  if (!feedback.tenantId || feedback.tenantId !== currentUser.tenantId) return false;
  return currentUser.role === "hospital_admin" || currentUser.role === "admin";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const scope = searchParams.get("scope");
    const assignedTo = searchParams.get("assignedTo");
    const tenantId = searchParams.get("tenantId");
    const userId = searchParams.get("userId");
    const patientFeedbackOnly = searchParams.get("patientFeedbackOnly") === "true";

    let feedback;

    // If patientFeedbackOnly flag is set, use the special method for patient feedback
    if (patientFeedbackOnly && tenantId) {
      feedback = await service.getPatientFeedbacksByTenant(tenantId, {
        status: status || undefined,
        type: type || undefined,
      });
    } else {
      // Standard feedback fetch
      feedback = await service.getFeedback({
        status: status || undefined,
        type: type || undefined,
        scope: scope || undefined,
        assignedTo: assignedTo || undefined,
        tenantId: tenantId || undefined,
        userId: userId || undefined,
      });
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { tenantId, type, title, description, priority, patientFeedback, scope } = data;

    if (!type || !title) {
      return NextResponse.json({ error: "Type and title are required" }, { status: 400 });
    }

    const currentUser = await resolveCurrentAppUser(request, tenantId || undefined);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedScope = service.resolveScope(type, scope);

    const feedback = await service.createFeedback({
      userId: currentUser.id,
      tenantId: currentUser.tenantId ?? tenantId ?? undefined,
      userName: currentUser.fullName ?? undefined,
      userEmail: currentUser.email ?? undefined,
      type,
      title,
      description,
      priority,
      scope: resolvedScope,
      forcePatientFeedback: patientFeedback,
    });

    await notifyFeedbackRecipients({
      feedbackId: feedback.id,
      feedbackType: type,
      feedbackTitle: title,
      priority: priority || "medium",
      scope: resolvedScope,
      submitterId: currentUser.id,
      submitterName: currentUser.fullName || currentUser.email,
      submitterEmail: currentUser.email,
      tenantId: currentUser.tenantId,
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Error creating feedback:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create feedback" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { feedbackId, status, assignedTo, resolution } = data;

    if (!feedbackId) {
      return NextResponse.json({ error: "Feedback ID required" }, { status: 400 });
    }

    const currentUser = await resolveCurrentAppUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const feedbackAccess = await service.getFeedbackAccess(feedbackId);
    if (!feedbackAccess || !canManageFeedback(currentUser, feedbackAccess)) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    const updatedFeedback = await service.updateFeedbackStatus(
      feedbackId,
      status,
      assignedTo,
      resolution
    );

    const fullFeedback = await service.getFeedbackById(feedbackId);
    if (fullFeedback) {
      await notifyFeedbackSubmitter({
        feedbackId,
        feedbackTitle: fullFeedback.title,
        feedbackType: fullFeedback.type,
        feedbackScope: fullFeedback.scope || feedbackAccess.scope,
        feedbackOwnerId: fullFeedback.user?.id,
        tenantId: fullFeedback.user?.tenantId || feedbackAccess.tenantId,
        updatedById: currentUser.id,
        updatedByName: currentUser.fullName || currentUser.email,
        status: status || fullFeedback.status,
        resolution,
      });
    }

    return NextResponse.json({ feedback: updatedFeedback });
  } catch (error) {
    console.error("Error updating feedback:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update feedback" }, { status: 500 });
  }
}
