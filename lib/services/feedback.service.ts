import { db } from "@/lib/db";
import { feedbacks, users, tenants, userRoles, roles } from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";

export class FeedbackService {
  async createFeedback(data: {
    userId?: string;
    tenantId?: string;
    userName?: string;
    userEmail?: string;
    type: string;
    title: string;
    description?: string;
    priority?: string;
    forcePatientFeedback?: boolean;
  }) {
    // Determine if this is patient feedback by checking the user's role
    let patientFeedback = data.forcePatientFeedback || false;
    if (!data.forcePatientFeedback && data.userId) {
      const roleRec = await db.query.userRoles.findFirst({
        where: eq(userRoles.userId, data.userId),
        with: { role: true },
      });
      const roleName = roleRec?.role?.name;
      if (roleName === "patient") patientFeedback = true;
    }

    const insert = await db.insert(feedbacks).values({
      tenantId: data.tenantId,
      userId: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      type: data.type,
      title: data.title,
      description: data.description,
      priority: data.priority || "medium",
      status: "open",
      patientFeedback,
    }).returning();

    return insert[0];
  }

  async getFeedback(filters: {
    status?: string;
    type?: string;
    assignedTo?: string;
    tenantId?: string;
    userId?: string;
  }) {
    const whereClauses: any[] = [];

    if (filters.status) whereClauses.push(eq(feedbacks.status, filters.status));
    if (filters.type) whereClauses.push(eq(feedbacks.type, filters.type));
    if (filters.assignedTo) whereClauses.push(eq(feedbacks.assignedTo, filters.assignedTo));
    if (filters.tenantId) whereClauses.push(eq(feedbacks.tenantId, filters.tenantId));
    if (filters.userId) whereClauses.push(eq(feedbacks.userId, filters.userId));

    // If no tenantId and no userId provided, assume this is a super-admin request and return only platform feedback
    if (!filters.tenantId && !filters.userId) {
      whereClauses.push(eq(feedbacks.patientFeedback, false));
    }

    const results = await db.query.feedbacks.findMany({
      where: whereClauses.length > 0 ? and(...whereClauses) : undefined,
      with: {
        tenant: true,
        user: true,
        assignedToUser: {
          columns: { id: true, fullName: true, email: true },
        } as any,
      },
      orderBy: desc(feedbacks.createdAt),
    } as any);

    // Normalize result objects for API consumption
    const mapped = results.map((f: any) => ({
      id: f.id,
      type: f.type,
      title: f.title,
      description: f.description,
      status: f.status,
      priority: f.priority,
      createdAt: f.createdAt,
      user: {
        id: f.user?.id || f.userId,
        fullName: f.user?.fullName || f.userName,
        email: f.user?.email || f.userEmail,
        tenantId: f.tenantId,
      },
      tenant: f.tenant ? { id: f.tenant.id, name: f.tenant.name } : { id: f.tenantId, name: "" },
      assignedToUser: f.assignedToUser ? { id: f.assignedToUser.id, fullName: f.assignedToUser.fullName, email: f.assignedToUser.email } : undefined,
      resolvedAt: f.resolvedAt,
      resolution: f.resolution,
    }));

    return mapped;
  }

  async updateFeedbackStatus(feedbackId: string, status?: string, assignedTo?: string, resolution?: string) {
    const updateData: any = {};
    if (status) updateData.status = status;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (resolution) {
      updateData.resolution = resolution;
      updateData.resolvedAt = new Date();
    }

    await db.update(feedbacks).set(updateData).where(eq(feedbacks.id, feedbackId));

    const updated = await db.query.feedbacks.findFirst({ where: eq(feedbacks.id, feedbackId) });
    return updated;
  }

  // Get patient feedbacks for a specific hospital (for hospital admin view)
  async getPatientFeedbacksByTenant(tenantId: string, filters?: {
    status?: string;
    type?: string;
  }) {
    const whereClauses: any[] = [
      eq(feedbacks.tenantId, tenantId),
      eq(feedbacks.patientFeedback, true),
    ];

    if (filters?.status) whereClauses.push(eq(feedbacks.status, filters.status));
    if (filters?.type) whereClauses.push(eq(feedbacks.type, filters.type));

    const results = await db.query.feedbacks.findMany({
      where: and(...whereClauses),
      with: {
        tenant: true,
        user: true,
        assignedToUser: {
          columns: { id: true, fullName: true, email: true },
        } as any,
      },
      orderBy: desc(feedbacks.createdAt),
    } as any);

    // Normalize result objects
    const mapped = results.map((f: any) => ({
      id: f.id,
      type: f.type,
      title: f.title,
      description: f.description,
      status: f.status,
      priority: f.priority,
      createdAt: f.createdAt,
      user: {
        id: f.user?.id || f.userId,
        fullName: f.user?.fullName || f.userName,
        email: f.user?.email || f.userEmail,
        tenantId: f.tenantId,
      },
      tenant: f.tenant ? { id: f.tenant.id, name: f.tenant.name } : { id: f.tenantId, name: "" },
      assignedToUser: f.assignedToUser ? { id: f.assignedToUser.id, fullName: f.assignedToUser.fullName, email: f.assignedToUser.email } : undefined,
      resolvedAt: f.resolvedAt,
      resolution: f.resolution,
    }));

    return mapped;
  }
}

export const feedbackService = new FeedbackService();

