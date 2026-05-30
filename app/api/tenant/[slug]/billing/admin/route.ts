import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { auditLogs, expenses, invoices, patients, payments } from "@/lib/db/schema";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WAGE_CATEGORIES = ["wage", "wages", "salary", "salaries", "payroll", "staff_wages"];

function money(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIso(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : "";
}

function normalizeStatus(value?: string | null) {
  return String(value || "pending").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

async function getInvoiceRows(tenantId: string) {
  const [invoiceRows, paymentRows] = await Promise.all([
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        patientId: invoices.patientId,
        patientName: patients.fullName,
        patientEmail: patients.email,
        patientPhone: patients.phone,
        amount: invoices.amount,
        amountDue: invoices.amountDue,
        totalAmount: invoices.totalAmount,
        status: invoices.status,
        dueDate: invoices.dueDate,
        description: invoices.description,
        notes: invoices.notes,
        paymentTerms: invoices.paymentTerms,
        items: invoices.items,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
      })
      .from(invoices)
      .leftJoin(patients, eq(patients.id, invoices.patientId))
      .where(and(eq(invoices.tenantId, tenantId), isNull(invoices.deletedAt)))
      .orderBy(desc(invoices.createdAt)),
    db
      .select({
        id: payments.id,
        invoiceId: payments.invoiceId,
        amount: payments.amount,
        method: payments.method,
        status: payments.status,
        transactionId: payments.transactionId,
        processedAt: payments.processedAt,
        notes: payments.notes,
      })
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), isNull(payments.deletedAt))),
  ]);

  const paymentsByInvoice = new Map<string, typeof paymentRows>();
  for (const payment of paymentRows) {
    if (!payment.invoiceId) continue;
    paymentsByInvoice.set(payment.invoiceId, [...(paymentsByInvoice.get(payment.invoiceId) || []), payment]);
  }

  return invoiceRows.map((invoice) => {
    const invoicePayments = paymentsByInvoice.get(invoice.id) || [];
    const paidAmount = invoicePayments.filter((payment) => payment.status === "completed").reduce((sum, payment) => sum + money(payment.amount), 0);
    const totalAmount = money(invoice.totalAmount || invoice.amount);
    const amountDue = invoice.amountDue == null ? Math.max(0, totalAmount - paidAmount) : money(invoice.amountDue);
    const status = normalizeStatus(invoice.status || (amountDue <= 0 ? "paid" : "pending"));

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber || invoice.id.slice(0, 8).toUpperCase(),
      patientId: invoice.patientId,
      patientName: invoice.patientName || "Unknown patient",
      patientEmail: invoice.patientEmail || "",
      patientPhone: invoice.patientPhone || "",
      totalAmount,
      amountDue,
      paidAmount,
      status,
      dueDate: invoice.dueDate || "",
      description: invoice.description || "",
      notes: invoice.notes || "",
      paymentTerms: invoice.paymentTerms || "",
      items: Array.isArray(invoice.items) ? invoice.items : [],
      payments: invoicePayments.map((payment) => ({
        id: payment.id,
        amount: money(payment.amount),
        method: payment.method || "unknown",
        status: payment.status || "pending",
        transactionId: payment.transactionId || "",
        processedAt: toIso(payment.processedAt),
        notes: payment.notes || "",
      })),
      createdAt: toIso(invoice.createdAt),
      updatedAt: toIso(invoice.updatedAt),
    };
  });
}

async function getWageRows(tenantId: string) {
  const rows = await db
    .select({
      id: expenses.id,
      category: expenses.category,
      vendor: expenses.vendor,
      description: expenses.description,
      amount: expenses.amount,
      currency: expenses.currency,
      expenseDate: expenses.expenseDate,
      paymentMethod: expenses.paymentMethod,
      reference: expenses.reference,
      status: expenses.status,
      receiptUrl: expenses.receiptUrl,
      approvedBy: expenses.approvedBy,
      metadata: expenses.metadata,
      createdAt: expenses.createdAt,
      updatedAt: expenses.updatedAt,
    })
    .from(expenses)
    .where(and(eq(expenses.tenantId, tenantId), inArray(expenses.category, WAGE_CATEGORIES), isNull(expenses.deletedAt)))
    .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));

  return rows.map((row) => ({
    id: row.id,
    staffName: row.vendor || (row.metadata as any)?.staffName || "Staff wage",
    description: row.description || "Wage approval request",
    amount: money(row.amount),
    currency: row.currency || "USD",
    expenseDate: row.expenseDate || "",
    paymentMethod: row.paymentMethod || "",
    reference: row.reference || "",
    status: normalizeStatus(row.status),
    receiptUrl: row.receiptUrl || "",
    approvedBy: row.approvedBy || "",
    metadata: row.metadata || {},
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }));
}

function buildStats(invoiceRows: Awaited<ReturnType<typeof getInvoiceRows>>, wageRows: Awaited<ReturnType<typeof getWageRows>>) {
  const paidRevenue = invoiceRows.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + invoice.paidAmount, 0);
  const outstanding = invoiceRows.filter((invoice) => invoice.status !== "paid").reduce((sum, invoice) => sum + invoice.amountDue, 0);
  const overdue = invoiceRows.filter((invoice) => invoice.status !== "paid" && invoice.dueDate && new Date(invoice.dueDate).getTime() < Date.now());

  return {
    totalInvoices: invoiceRows.length,
    paidInvoices: invoiceRows.filter((invoice) => invoice.status === "paid").length,
    pendingInvoices: invoiceRows.filter((invoice) => invoice.status !== "paid").length,
    overdueInvoices: overdue.length,
    totalBilled: invoiceRows.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
    paidRevenue,
    outstanding,
    overdueAmount: overdue.reduce((sum, invoice) => sum + invoice.amountDue, 0),
    wageRequests: wageRows.length,
    pendingWages: wageRows.filter((wage) => ["pending", "open"].includes(wage.status)).length,
    approvedWages: wageRows.filter((wage) => wage.status === "approved").length,
    paidWages: wageRows.filter((wage) => wage.status === "paid").length,
    wageLiability: wageRows.filter((wage) => wage.status !== "paid").reduce((sum, wage) => sum + wage.amount, 0),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");
    const status = searchParams.get("status") || "all";
    const [invoiceRows, wageRows] = await Promise.all([getInvoiceRows(tenantId), getWageRows(tenantId)]);
    const filteredInvoices = invoiceRows.filter((invoice) => status === "all" || invoice.status === status);

    if (invoiceId) {
      const invoice = invoiceRows.find((item) => item.id === invoiceId);
      if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      return NextResponse.json({ invoice }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    return NextResponse.json({
      invoices: filteredInvoices,
      wages: wageRows,
      stats: buildStats(invoiceRows, wageRows),
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Error fetching admin billing:", error);
    return NextResponse.json({ error: "Failed to fetch billing data" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "").trim();

    if (body.invoiceId) return NextResponse.json({ error: "Hospital admins can view invoices but cannot update invoice payment status" }, { status: 403 });

    if (body.wageId) {
      const wageId = String(body.wageId);
      const status = action === "approve_wage" ? "approved" : action === "reject_wage" ? "rejected" : action === "mark_wage_paid" ? "paid" : "";
      if (!status) return NextResponse.json({ error: "Unsupported wage action" }, { status: 400 });
      const updateValues: Partial<typeof expenses.$inferInsert> = { status, updatedAt: new Date() };
      if (action === "approve_wage") updateValues.approvedBy = admin.user?.id || null;
      await db.update(expenses).set(updateValues).where(and(eq(expenses.id, wageId), eq(expenses.tenantId, tenantId)));
      await db.insert(auditLogs).values({ tenantId, userId: admin.user?.id || null, action: `billing.wage.${action}`, entity: "expense", entityId: wageId, metadata: { status } }).catch(() => null);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "No supported action target provided" }, { status: 400 });
  } catch (error: any) {
    console.error("Error updating billing:", error);
    return NextResponse.json({ error: error?.message || "Failed to update billing" }, { status: 500 });
  }
}
