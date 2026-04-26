import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq, like, desc, sql } from "drizzle-orm";

export class TenantService {
  async createTenant(data: {
    name: string;
    slug: string;
    plan: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
  }) {
    return db.insert(tenants).values({
      ...data,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
  }

  async getTenant(id: string) {
    return db.query.tenants.findFirst({
      where: eq(tenants.id, id),
    });
  }

  async getAllTenants(options?: {
    search?: string;
    plan?: string;
    status?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let query = db.select().from(tenants);

    if (options?.search) {
      query = query.where(like(tenants.name, `%${options.search}%`));
    }

    if (options?.plan) {
      query = query.where(eq(tenants.plan, options.plan));
    }

    if (options?.status !== undefined) {
      query = query.where(eq(tenants.isActive, options.status));
    }

    query = query.orderBy(desc(tenants.createdAt));

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  async updateTenant(id: string, data: Partial<{
    name: string;
    slug: string;
    plan: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    isActive: boolean;
  }>) {
    return db.update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
  }

  async suspendTenant(id: string) {
    return db.update(tenants)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
  }

  async activateTenant(id: string) {
    return db.update(tenants)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
  }

  async deleteTenant(id: string) {
    return db.delete(tenants).where(eq(tenants.id, id));
  }

  async getTenantStats() {
    const result = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(case when ${tenants.isActive} = true then 1 end)`,
        inactive: sql<number>`count(case when ${tenants.isActive} = false then 1 end)`,
      })
      .from(tenants);

    return result[0];
  }

  async getUsageStats() {
    // This would typically aggregate from usage logs
    // For now, return mock data structure
    return {
      totalApiCalls: 4200000,
      totalStorageUsed: 234000000000, // bytes
      totalActiveUsers: 8234,
      averageResponseTime: 145,
      topConsumers: [
        { id: "1", name: "City Medical Center", apiCalls: 542000, storageUsed: 45000000000 },
        { id: "2", name: "County Hospital", apiCalls: 421000, storageUsed: 32000000000 },
        { id: "3", name: "Private Clinic", apiCalls: 398000, storageUsed: 28000000000 },
        { id: "4", name: "Medical University", apiCalls: 334000, storageUsed: 22000000000 },
      ]
    };
  }
}
