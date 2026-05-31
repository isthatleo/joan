import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";

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
    const conditions: SQL[] = [];

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

    const baseQuery = conditions.length
      ? db.select().from(auditLogs).where(and(...conditions)).orderBy(desc(auditLogs.createdAt))
      : db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));

    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    return baseQuery.limit(limit).offset(offset);
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
      const action = log.action || "unknown";
      stats[action] = (stats[action] || 0) + 1;
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
        const action = log.action || "unknown";
        acc[action] = (acc[action] || 0) + 1;
        return acc;
      }, {}),
      lastActivity: logs[0]?.createdAt,
    };
  }
}

