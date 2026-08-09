import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments, invoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireTenantUser } from "@/lib/api/route-guards";

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantUser(request, ["accountant", "receptionist", "hospital_admin"]);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
    }

    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
      columns: { id: true, tenantId: true },
    });
    if (!invoice || (access.user.role !== "super_admin" && invoice.tenantId !== access.user.tenantId)) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const paymentList = await db.query.payments.findMany({
      where: eq(payments.invoiceId, invoiceId),
    });

    return NextResponse.json(paymentList);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantUser(request, ["accountant", "receptionist"]);
    if (!access.ok) return access.response;

    const data = await request.json();
    const { invoiceId, method, amount } = data;

    if (!invoiceId || !method || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [payment] = await db.insert(payments).values({
      tenantId: access.user.tenantId,
      invoiceId,
      method,
      amount,
      status: "completed",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
  }
}

