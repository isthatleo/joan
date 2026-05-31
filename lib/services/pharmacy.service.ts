import { db } from "@/lib/db";
import { prescriptions, prescriptionItems, inventoryItems } from "@/lib/db/schema";
import { and, eq, ilike, type SQL } from "drizzle-orm";

export class PharmacyService {
  async createPrescription(tenantIdOrData: string | {
    visitId?: string;
    doctorId: string;
    patientId?: string;
  }, maybeData?: Record<string, any>) {
    const data = typeof tenantIdOrData === "string" ? { ...maybeData, tenantId: tenantIdOrData } : tenantIdOrData;
    return db.insert(prescriptions).values(data as any).returning();
  }

  async addPrescriptionItem(tenantIdOrData: string | {
    prescriptionId: string;
    drugName: string;
    dosage: string;
    duration: string;
  }, maybeData?: Record<string, any>) {
    const data = typeof tenantIdOrData === "string" ? maybeData : tenantIdOrData;
    return db.insert(prescriptionItems).values(data as any).returning();
  }

  async getInventory(tenantId: string, filters?: { search?: string; category?: string; lowStock?: boolean; expiringSoon?: boolean }) {
    const conditions: SQL[] = [eq(inventoryItems.tenantId, tenantId)];
    if (filters?.search) conditions.push(ilike(inventoryItems.name, `%${filters.search}%`));
    return db.query.inventoryItems.findMany({
      where: and(...conditions),
    });
  }

  async updateInventoryStock(id: string, stock: string) {
    return db.update(inventoryItems)
      .set({ stock })
      .where(eq(inventoryItems.id, id));
  }

  async getExpiringDrugs(tenantId: string) {
    return db.query.inventoryItems.findMany({
      where: eq(inventoryItems.tenantId, tenantId),
    });
  }

  async getPrescriptionQueue(tenantId: string) {
    return db.query.prescriptions.findMany({
      where: eq(prescriptions.tenantId, tenantId),
    });
  }

  async getMedications(tenantId: string, filters?: { search?: string; category?: string; isActive?: boolean }) {
    return this.getInventory(tenantId, filters);
  }

  async getMedicationsForPrescription(tenantId: string, search?: string, category?: string) {
    return this.getInventory(tenantId, { search, category });
  }

  async updateStockStatus(_tenantId: string, itemId: string, status: string) {
    const [updated] = await db.update(inventoryItems)
      .set({ stock: status, updatedAt: new Date() })
      .where(eq(inventoryItems.id, itemId))
      .returning();
    return updated;
  }

  async updateStockQuantity(_tenantId: string, itemId: string, quantity: number) {
    const [updated] = await db.update(inventoryItems)
      .set({ stock: String(quantity), updatedAt: new Date() })
      .where(eq(inventoryItems.id, itemId))
      .returning();
    return updated;
  }

  async addNewStock(tenantId: string, data: {
    name: string;
    quantity: number;
    expiryDate?: Date;
  } & Record<string, any>) {
    const [created] = await db.insert(inventoryItems).values({
      tenantId,
      name: data.name,
      stock: String(data.quantity ?? 0),
      expiryDate: data.expiryDate || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created;
  }

  async getSuppliers(_tenantId: string, _filters?: Record<string, any>) {
    return [];
  }

  async getPrescriptions(tenantId: string, _filters?: Record<string, any>) {
    return db.query.prescriptions.findMany({
      where: eq(prescriptions.tenantId, tenantId),
    });
  }

  async getPrescriptionWithStockStatus(id: string) {
    return db.query.prescriptions.findFirst({
      where: eq(prescriptions.id, id),
    });
  }
}
