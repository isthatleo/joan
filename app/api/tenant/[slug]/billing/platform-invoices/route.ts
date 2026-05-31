import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { platformInvoices, subscriptionPlans } from "@/lib/db/schema";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function money(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function iso(value?: Date | string | null) {
  return value ? new Date(value).toISOString() : "";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const rows = await db
      .select({
        id: platformInvoices.id,
        invoiceNumber: platformInvoices.invoiceNumber,
        status: platformInvoices.status,
        currency: platformInvoices.currency,
        subtotal: platformInvoices.subtotal,
        tax: platformInvoices.tax,
        total: platformInvoices.total,
        amountPaid: platformInvoices.amountPaid,
        billingEmail: platformInvoices.billingEmail,
        billingName: platformInvoices.billingName,
        issuedAt: platformInvoices.issuedAt,
        dueAt: platformInvoices.dueAt,
        paidAt: platformInvoices.paidAt,
        periodStart: platformInvoices.periodStart,
        periodEnd: platformInvoices.periodEnd,
        lineItems: platformInvoices.lineItems,
        notes: platformInvoices.notes,
        metadata: platformInvoices.metadata,
        planName: subscriptionPlans.name,
        planCode: subscriptionPlans.code,
      })
      .from(platformInvoices)
      .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, platformInvoices.planId))
      .where(and(eq(platformInvoices.tenantId, tenantId), isNull(platformInvoices.deletedAt)))
      .orderBy(desc(platformInvoices.issuedAt), desc(platformInvoices.createdAt));

    const invoices = rows.map((row) => {
      const total = money(row.total);
      const amountPaid = money(row.amountPaid);
      return {
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        status: row.status,
        currency: row.currency || "USD",
        subtotal: money(row.subtotal),
        tax: money(row.tax),
        total,
        amountPaid,
        amountDue: Math.max(0, total - amountPaid),
        billingEmail: row.billingEmail || "",
        billingName: row.billingName || "",
        issuedAt: iso(row.issuedAt),
        dueAt: iso(row.dueAt),
        paidAt: iso(row.paidAt),
        periodStart: iso(row.periodStart),
        periodEnd: iso(row.periodEnd),
        lineItems: Array.isArray(row.lineItems) ? row.lineItems : [],
        notes: row.notes || "",
        metadata: row.metadata || {},
        planName: row.planName || "",
        planCode: row.planCode || "",
      };
    });

    const stats = {
      totalInvoices: invoices.length,
      paidInvoices: invoices.filter((invoice) => invoice.status === "paid").length,
      outstandingInvoices: invoices.filter((invoice) => invoice.status !== "paid").length,
      totalBilled: invoices.reduce((sum, invoice) => sum + invoice.total, 0),
      totalPaid: invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0),
      totalDue: invoices.reduce((sum, invoice) => sum + invoice.amountDue, 0),
    };

    return NextResponse.json({ invoices, stats }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Error fetching tenant platform invoices:", error);
    return NextResponse.json({ error: "Failed to fetch platform invoices" }, { status: 500 });
  }
}
