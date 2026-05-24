import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { labOrders, labResults } from "@/lib/db/schema";

export class LabService {
  async createLabOrder(data: typeof labOrders.$inferInsert) {
    return db.insert(labOrders).values(data).returning();
  }

  async uploadLabResult(data: typeof labResults.$inferInsert) {
    return db.insert(labResults).values(data).returning();
  }

  async getLabOrder(id: string, tenantId?: string) {
    return db.query.labOrders.findFirst({
      where: tenantId
        ? and(eq(labOrders.id, id), eq(labOrders.tenantId, tenantId), isNull(labOrders.deletedAt))
        : and(eq(labOrders.id, id), isNull(labOrders.deletedAt)),
    });
  }

  async getLabOrders(tenantId: string, status?: string, limit = 100) {
    const conditions = [eq(labOrders.tenantId, tenantId), isNull(labOrders.deletedAt)];
    if (status) conditions.push(eq(labOrders.status, status));

    return db.query.labOrders.findMany({
      where: and(...conditions),
      orderBy: desc(labOrders.orderedAt),
      limit,
    });
  }

  async getLabResults(labOrderId: string, tenantId?: string) {
    return db.query.labResults.findMany({
      where: tenantId
        ? and(eq(labResults.labOrderId, labOrderId), eq(labResults.tenantId, tenantId), isNull(labResults.deletedAt))
        : and(eq(labResults.labOrderId, labOrderId), isNull(labResults.deletedAt)),
      orderBy: desc(labResults.createdAt),
    });
  }

  async updateLabOrderStatus(id: string, status: string, tenantId?: string) {
    return db
      .update(labOrders)
      .set({ status, updatedAt: new Date() })
      .where(
        tenantId
          ? and(eq(labOrders.id, id), eq(labOrders.tenantId, tenantId), isNull(labOrders.deletedAt))
          : and(eq(labOrders.id, id), isNull(labOrders.deletedAt))
      )
      .returning();
  }

  async updateLabResult(id: string, updates: Partial<typeof labResults.$inferInsert>, tenantId?: string) {
    return db
      .update(labResults)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        tenantId
          ? and(eq(labResults.id, id), eq(labResults.tenantId, tenantId), isNull(labResults.deletedAt))
          : and(eq(labResults.id, id), isNull(labResults.deletedAt))
      )
      .returning();
  }

  async deleteLabOrder(id: string, tenantId?: string) {
    return db
      .update(labOrders)
      .set({ deletedAt: new Date(), status: "cancelled", updatedAt: new Date() })
      .where(
        tenantId
          ? and(eq(labOrders.id, id), eq(labOrders.tenantId, tenantId), isNull(labOrders.deletedAt))
          : and(eq(labOrders.id, id), isNull(labOrders.deletedAt))
      )
      .returning();
  }
}
