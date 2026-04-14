import { db } from "@/lib/db";
import { labOrders, labResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export class LabService {
  async createLabOrder(data: {
    visitId: string;
    orderedBy: string;
    status: string;
  }) {
    return db.insert(labOrders).values(data).returning();
  }

  async uploadLabResult(data: {
    labOrderId: string;
    resultData: any;
    fileUrl: string;
  }) {
    return db.insert(labResults).values(data).returning();
  }

  async getLabOrder(id: string) {
    return db.query.labOrders.findFirst({
      where: eq(labOrders.id, id),
    });
  }

  async getLabResults(labOrderId: string) {
    return db.query.labResults.findMany({
      where: eq(labResults.labOrderId, labOrderId),
    });
  }

  async updateLabOrderStatus(id: string, status: string) {
    return db.update(labOrders)
      .set({ status })
      .where(eq(labOrders.id, id));
  }
}
