import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const payments = await db.$queryRaw`
      SELECT id, amount, created_at
      FROM payments
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const invoices = await db.$queryRaw`
      SELECT id, amount, created_at
      FROM invoices
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const activities = [
      ...(payments as any[]).map((payment) => ({
        id: `payment-${payment.id}`,
        type: "payment",
        title: "Payment recorded",
        description: `Payment ${payment.id} was recorded`,
        amount: Number(payment.amount || 0),
        timestamp: payment.created_at,
      })),
      ...(invoices as any[]).map((invoice) => ({
        id: `invoice-${invoice.id}`,
        type: "invoice",
        title: "Invoice issued",
        description: `Invoice ${invoice.id} was created`,
        amount: Number(invoice.amount || 0),
        timestamp: invoice.created_at,
      })),
    ]
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
      .slice(0, 8);

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching accountant activities:", error);
    return NextResponse.json([], { status: 200 });
  }
}
