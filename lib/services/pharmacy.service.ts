import { db } from "@/lib/db";
import { prescriptions, prescriptionItems, inventoryItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export class PharmacyService {
  async createPrescription(data: {
    visitId: string;
    doctorId: string;
  }) {
    return db.insert(prescriptions).values(data).returning();
  }

  async addPrescriptionItem(data: {
    prescriptionId: string;
    drugName: string;
    dosage: string;
    duration: string;
  }) {
    return db.insert(prescriptionItems).values(data).returning();
  }

  async getInventory(tenantId: string) {
    return db.query.inventoryItems.findMany({
      where: eq(inventoryItems.tenantId, tenantId),
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
    return db.query.prescriptions.findMany();
  }
}
