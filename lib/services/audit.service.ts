import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { eq, gte, lte, and } from "drizzle-orm";

export class AuditService {
  async logAction(data: {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    metadata?: Record<string, any>;
  }) {
    return db.insert(auditLogs).values({
      ...data,
      createdAt: new Date(),
    }).returning();
  }

  async getAuditLogs(options?: {
    userId?: string;
    action?: string;
    entity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    let query = db.select().from(auditLogs);

    const conditions = [];

    if (options?.userId) {
      conditions.push(eq(auditLogs.userId, options.userId));
    }

    if (options?.action) {
      conditions.push(eq(auditLogs.action, options.action));
    }

    if (options?.entity) {
      conditions.push(eq(auditLogs.entity, options.entity));
    }

    if (options?.startDate) {
      conditions.push(gte(auditLogs.createdAt, options.startDate));
    }

    if (options?.endDate) {
      conditions.push(lte(auditLogs.createdAt, options.endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Order by recency
    query = query.orderBy((audit) => [
      {
        column: auditLogs.createdAt,
        desc: true,
      },
    ]);

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  async getAuditLog(id: string) {
    return db.query.auditLogs.findFirst({
      where: eq(auditLogs.id, id),
    });
  }

  async deleteOldLogs(beforeDate: Date) {
    return db.delete(auditLogs)
      .where(lte(auditLogs.createdAt, beforeDate));
  }

  async getActionStats() {
    const logs = await db.select().from(auditLogs);
    const stats: Record<string, number> = {};

    logs.forEach(log => {
      stats[log.action] = (stats[log.action] || 0) + 1;
    });

    return stats;
  }

  async getUserActivityStats(userId: string) {
    const logs = await db.query.auditLogs.findMany({
      where: eq(auditLogs.userId, userId),
    });

    return {
      totalActions: logs.length,
      actionsByType: logs.reduce((acc: Record<string, number>, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {}),
      lastActivity: logs[0]?.createdAt,
    };
  }
}

