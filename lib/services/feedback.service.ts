import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { feedbacks, roles, tenants, userRoles, users } from "@/lib/db/schema";

type FeedbackRecord = {
  id: string;
  scope: string;
  type: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  tenantId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  tenantName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedToEmail: string | null;
  resolvedAt: Date | string | null;
  resolution: string | null;
  patientFeedback?: boolean;
};

function mapFeedback(record: FeedbackRecord) {
  return {
    id: record.id,
    scope: record.scope,
    type: record.type,
    title: record.title,
    description: record.description ?? "",
    status: record.status,
    priority: record.priority,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    user: {
      id: record.userId,
      fullName: record.userName,
      email: record.userEmail,
      tenantId: record.tenantId,
    },
    tenant: record.tenantId ? { id: record.tenantId, name: record.tenantName || "" } : null,
    assignedToUser: record.assignedToId
      ? {
          id: record.assignedToId,
          fullName: record.assignedToName,
          email: record.assignedToEmail,
        }
      : undefined,
    resolvedAt: record.resolvedAt,
    resolution: record.resolution,
    patientFeedback: Boolean(record.patientFeedback),
    destination: record.scope === "platform" ? "super_admin" : "hospital_admin",
    destinationLabel: record.scope === "platform" ? "Super admin" : "Hospital admin",
  };
}

export class FeedbackService {
  static readonly PLATFORM_TYPES = new Set([
    "bug",
    "system_bug",
    "platform_bug",
    "feature_request",
    "feature_improvement",
    "feature_addition",
    "platform_improvement",
    "improvement",
    "integration_issue",
    "platform_billing",
    "platform_general",
    "security_issue",
  ]);

  static readonly TENANT_TYPES = new Set([
    "service",
    "service_issue",
    "service_delivery",
    "service_improvement",
    "staff",
    "staff_conduct",
    "wait_time",
    "billing",
    "care_quality",
    "facility",
    "appointment",
    "communication",
    "general",
  ]);

  resolveScope(type: string, requestedScope?: string | null) {
    const normalizedType = String(type || "").toLowerCase();
    const normalizedRequestedScope = String(requestedScope || "").toLowerCase();

    if (FeedbackService.TENANT_TYPES.has(normalizedType)) return "tenant";
    if (normalizedRequestedScope === "tenant") return "tenant";
    if (normalizedRequestedScope === "platform") {
      return "platform";
    }

    if (FeedbackService.PLATFORM_TYPES.has(normalizedType)) return "platform";
    return "tenant";
  }

  getRoutingInfo(type: string, scope?: string | null, forcePatientFeedback?: boolean) {
    if (forcePatientFeedback) {
      return {
        scope: "tenant" as const,
        destination: "hospital_admin" as const,
        label: "Hospital admin",
        reason: "Service/customer feedback is handled by the tenant hospital administration.",
      };
    }

    const resolvedScope = this.resolveScope(type, scope);
    if (resolvedScope === "platform") {
      return {
        scope: "platform" as const,
        destination: "super_admin" as const,
        label: "Super admin",
        reason: "Platform bugs, feature requests, integrations, and product improvements are handled by super admins.",
      };
    }

    return {
      scope: "tenant" as const,
      destination: "hospital_admin" as const,
      label: "Hospital admin",
      reason: "Service delivery, staff, wait time, care quality, appointment, billing, and operational feedback stays with hospital admins.",
    };
  }

  async createFeedback(data: {
    userId?: string;
    tenantId?: string;
    userName?: string;
    userEmail?: string;
    type: string;
    title: string;
    description?: string;
    priority?: string;
    scope?: string;
    forcePatientFeedback?: boolean;
  }) {
    let patientFeedback = data.forcePatientFeedback || false;
    const routing = this.getRoutingInfo(data.type, data.scope, patientFeedback);
    const scope = routing.scope;

    if (!patientFeedback && data.userId) {
      const [roleRow] = await db
        .select({
          baseRole: users.role,
          linkedRole: roles.name,
        })
        .from(users)
        .leftJoin(userRoles, eq(userRoles.userId, users.id))
        .leftJoin(roles, eq(roles.id, userRoles.roleId))
        .where(and(eq(users.id, data.userId), isNull(users.deletedAt)))
        .limit(1);

      const roleNames = [roleRow?.baseRole, roleRow?.linkedRole]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      patientFeedback = roleNames.includes("patient");
    }

    const [inserted] = await db
      .insert(feedbacks)
      .values({
        tenantId: data.tenantId ?? null,
        userId: data.userId ?? null,
        userName: data.userName ?? null,
        userEmail: data.userEmail ?? null,
        scope,
        type: data.type,
        title: data.title,
        description: data.description ?? null,
        priority: data.priority || "medium",
        status: "open",
        patientFeedback,
      })
      .returning();

    return inserted;
  }

  async getFeedback(filters: {
    status?: string;
    type?: string;
    scope?: string;
    assignedTo?: string;
    tenantId?: string;
    userId?: string;
  }) {
    const whereClauses = [isNull(feedbacks.deletedAt)];

    if (filters.status) whereClauses.push(eq(feedbacks.status, filters.status));
    if (filters.type) whereClauses.push(eq(feedbacks.type, filters.type));
    if (filters.scope) whereClauses.push(eq(feedbacks.scope, filters.scope));
    if (filters.assignedTo) whereClauses.push(eq(feedbacks.assignedTo, filters.assignedTo));
    if (filters.tenantId) whereClauses.push(eq(feedbacks.tenantId, filters.tenantId));
    if (filters.userId) whereClauses.push(eq(feedbacks.userId, filters.userId));
    if (!filters.tenantId && !filters.userId) whereClauses.push(eq(feedbacks.patientFeedback, false));

    const records = await db
      .select({
        id: feedbacks.id,
        scope: feedbacks.scope,
        type: feedbacks.type,
        title: feedbacks.title,
        description: feedbacks.description,
        status: feedbacks.status,
        priority: feedbacks.priority,
        createdAt: feedbacks.createdAt,
        updatedAt: feedbacks.updatedAt,
        tenantId: feedbacks.tenantId,
        userId: feedbacks.userId,
        patientFeedback: feedbacks.patientFeedback,
        userName: sql<string | null>`coalesce(${users.fullName}, ${feedbacks.userName})`,
        userEmail: sql<string | null>`coalesce(${users.email}, ${feedbacks.userEmail})`,
        tenantName: tenants.name,
        assignedToId: feedbacks.assignedTo,
        assignedToName: sql<string | null>`null`,
        assignedToEmail: sql<string | null>`null`,
        resolvedAt: feedbacks.resolvedAt,
        resolution: feedbacks.resolution,
      })
      .from(feedbacks)
      .leftJoin(users, eq(users.id, feedbacks.userId))
      .leftJoin(tenants, eq(tenants.id, feedbacks.tenantId))
      .where(and(...whereClauses))
      .orderBy(desc(feedbacks.createdAt));

    return records.map((record) => mapFeedback(record as FeedbackRecord));
  }

  async getFeedbackById(feedbackId: string) {
    const [record] = await db
      .select({
        id: feedbacks.id,
        scope: feedbacks.scope,
        type: feedbacks.type,
        title: feedbacks.title,
        description: feedbacks.description,
        status: feedbacks.status,
        priority: feedbacks.priority,
        createdAt: feedbacks.createdAt,
        updatedAt: feedbacks.updatedAt,
        tenantId: feedbacks.tenantId,
        userId: feedbacks.userId,
        userName: sql<string | null>`coalesce(${users.fullName}, ${feedbacks.userName})`,
        userEmail: sql<string | null>`coalesce(${users.email}, ${feedbacks.userEmail})`,
        tenantName: tenants.name,
        patientFeedback: feedbacks.patientFeedback,
        assignedToId: feedbacks.assignedTo,
        assignedToName: sql<string | null>`null`,
        assignedToEmail: sql<string | null>`null`,
        resolvedAt: feedbacks.resolvedAt,
        resolution: feedbacks.resolution,
      })
      .from(feedbacks)
      .leftJoin(users, eq(users.id, feedbacks.userId))
      .leftJoin(tenants, eq(tenants.id, feedbacks.tenantId))
      .where(and(eq(feedbacks.id, feedbackId), isNull(feedbacks.deletedAt)))
      .limit(1);

    return record ? mapFeedback(record as FeedbackRecord) : null;
  }

  async getFeedbackAccess(feedbackId: string) {
    const [record] = await db
      .select({
        id: feedbacks.id,
        tenantId: feedbacks.tenantId,
        userId: feedbacks.userId,
        assignedTo: feedbacks.assignedTo,
        scope: feedbacks.scope,
      })
      .from(feedbacks)
      .where(and(eq(feedbacks.id, feedbackId), isNull(feedbacks.deletedAt)))
      .limit(1);

    return record ?? null;
  }

  async updateFeedbackStatus(feedbackId: string, status?: string, assignedTo?: string, resolution?: string) {
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;
    if (resolution) {
      updateData.resolution = resolution;
      updateData.resolvedAt = new Date();
    }

    const [updated] = await db
      .update(feedbacks)
      .set(updateData)
      .where(and(eq(feedbacks.id, feedbackId), isNull(feedbacks.deletedAt)))
      .returning();

    return updated;
  }

  async deleteFeedback(feedbackId: string) {
    const [deleted] = await db
      .update(feedbacks)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(feedbacks.id, feedbackId), isNull(feedbacks.deletedAt)))
      .returning({ id: feedbacks.id });

    return deleted ?? null;
  }

  async getPatientFeedbacksByTenant(tenantId: string, filters?: { status?: string; type?: string }) {
    const whereClauses = [
      isNull(feedbacks.deletedAt),
      eq(feedbacks.tenantId, tenantId),
      eq(feedbacks.patientFeedback, true),
    ];

    if (filters?.status) whereClauses.push(eq(feedbacks.status, filters.status));
    if (filters?.type) whereClauses.push(eq(feedbacks.type, filters.type));

    const records = await db
      .select({
        id: feedbacks.id,
        scope: feedbacks.scope,
        type: feedbacks.type,
        title: feedbacks.title,
        description: feedbacks.description,
        status: feedbacks.status,
        priority: feedbacks.priority,
        createdAt: feedbacks.createdAt,
        updatedAt: feedbacks.updatedAt,
        tenantId: feedbacks.tenantId,
        userId: feedbacks.userId,
        userName: sql<string | null>`coalesce(${users.fullName}, ${feedbacks.userName})`,
        userEmail: sql<string | null>`coalesce(${users.email}, ${feedbacks.userEmail})`,
        tenantName: tenants.name,
        assignedToId: feedbacks.assignedTo,
        assignedToName: sql<string | null>`null`,
        assignedToEmail: sql<string | null>`null`,
        resolvedAt: feedbacks.resolvedAt,
        resolution: feedbacks.resolution,
      })
      .from(feedbacks)
      .leftJoin(users, eq(users.id, feedbacks.userId))
      .leftJoin(tenants, eq(tenants.id, feedbacks.tenantId))
      .where(and(...whereClauses))
      .orderBy(desc(feedbacks.createdAt));

    return records.map((record) => mapFeedback(record as FeedbackRecord));
  }
}

export const feedbackService = new FeedbackService();
