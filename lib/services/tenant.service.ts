import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export class TenantService {
  async createTenant(data: {
    name: string;
    slug: string;
    plan: string;
  }) {
    return db.insert(tenants).values(data).returning();
  }

  async getTenant(id: string) {
    return db.query.tenants.findFirst({
      where: eq(tenants.id, id),
    });
  }

  async getAllTenants() {
    return db.query.tenants.findMany();
  }

  async updateTenant(id: string, data: any) {
    return db.update(tenants).set(data).where(eq(tenants.id, id));
  }

  async suspendTenant(id: string) {
    return db.update(tenants)
      .set({ isActive: false })
      .where(eq(tenants.id, id));
  }
}
