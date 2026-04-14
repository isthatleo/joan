import { db } from "@/lib/db";
import { invoices, invoiceItems, payments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export class BillingService {
  async createInvoice(data: {
    patientId: string;
    totalAmount: string;
    status: string;
  }) {
    return db.insert(invoices).values(data).returning();
  }

  async addInvoiceItem(data: {
    invoiceId: string;
    description: string;
    amount: string;
  }) {
    return db.insert(invoiceItems).values(data).returning();
  }

  async processPayment(data: {
    invoiceId: string;
    method: string; // cash, card, mobile_money
    amount: string;
    status: string;
  }) {
    return db.insert(payments).values(data).returning();
  }

  async getInvoiceById(id: string) {
    return db.query.invoices.findFirst({
      where: eq(invoices.id, id),
    });
  }

  async getTenantInvoices(tenantId: string) {
    return db.query.invoices.findMany({
      where: eq(invoices.id, tenantId),
    });
  }
}
