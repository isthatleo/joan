import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getTenantBrandingSettings, getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { invoices, patients, payments } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type InvoiceLineItem = {
  description?: string | null;
  quantity?: number | string | null;
  unitPrice?: number | string | null;
  amount?: number | string | null;
  category?: string | null;
};

function toNumber(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return `$${toNumber(value).toFixed(2)}`;
}

function formatDate(value?: Date | string | null) {
  if (!value) return "Not set";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not set"
    : date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeItems(rawItems: unknown, fallbackDescription: string, fallbackAmount: number): InvoiceLineItem[] {
  const items = Array.isArray(rawItems) ? rawItems as InvoiceLineItem[] : [];
  if (items.length > 0) return items;

  return [
    {
      description: fallbackDescription || "Hospital services",
      quantity: 1,
      unitPrice: fallbackAmount,
      amount: fallbackAmount,
      category: "service",
    },
  ];
}

async function getInvoiceForDownload(tenantId: string, invoiceId: string) {
  const [invoice] = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      patientId: invoices.patientId,
      patientName: patients.fullName,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
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
    .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoiceId), isNull(invoices.deletedAt)))
    .limit(1);

  if (!invoice) return null;

  const paymentRows = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      method: payments.method,
      status: payments.status,
      transactionId: payments.transactionId,
      processedAt: payments.processedAt,
      notes: payments.notes,
    })
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), eq(payments.invoiceId, invoice.id), isNull(payments.deletedAt)));

  const paidAmount = paymentRows
    .filter((payment) => String(payment.status || "").toLowerCase() === "completed")
    .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const totalAmount = toNumber(invoice.totalAmount || invoice.amount);
  const amountDue = invoice.amountDue == null ? Math.max(0, totalAmount - paidAmount) : toNumber(invoice.amountDue);
  const patientName = invoice.patientName || `${invoice.patientFirstName || ""} ${invoice.patientLastName || ""}`.trim() || "Unknown patient";

  return {
    ...invoice,
    invoiceNumber: invoice.invoiceNumber || invoice.id.slice(0, 8).toUpperCase(),
    patientName,
    patientEmail: invoice.patientEmail || "",
    patientPhone: invoice.patientPhone || "",
    totalAmount,
    amountDue,
    paidAmount,
    status: String(invoice.status || (amountDue <= 0 ? "paid" : "pending")).toLowerCase(),
    items: normalizeItems(invoice.items, invoice.description || "Hospital services", totalAmount),
    payments: paymentRows.map((payment) => ({
      ...payment,
      amount: toNumber(payment.amount),
      method: payment.method || "unknown",
      status: payment.status || "pending",
    })),
  };
}

function renderInvoiceHtml(invoice: NonNullable<Awaited<ReturnType<typeof getInvoiceForDownload>>>, branding: Awaited<ReturnType<typeof getTenantBrandingSettings>>) {
  const rows = invoice.items.map((item, index) => {
    const quantity = toNumber(item.quantity || 1) || 1;
    const amount = toNumber(item.amount || 0);
    const unitPrice = item.unitPrice == null ? amount / quantity : toNumber(item.unitPrice);
    const lineTotal = amount || quantity * unitPrice;

    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <strong>${escapeHtml(item.description || "Hospital service")}</strong>
          <span>${escapeHtml(item.category || "service")}</span>
        </td>
        <td class="right">${quantity}</td>
        <td class="right">${money(unitPrice)}</td>
        <td class="right">${money(lineTotal)}</td>
      </tr>
    `;
  }).join("");

  const paymentRows = invoice.payments.length
    ? invoice.payments.map((payment) => `
      <tr>
        <td>${escapeHtml(formatDate(payment.processedAt))}</td>
        <td>${escapeHtml(payment.method)}</td>
        <td>${escapeHtml(payment.status)}</td>
        <td class="right">${money(payment.amount)}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="4" class="muted">No payments recorded.</td></tr>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f5f2ed; color: #1f2933; font-family: Georgia, "Times New Roman", serif; }
    .page { width: 920px; margin: 32px auto; background: #fffaf2; border: 1px solid #e7dac5; box-shadow: 0 24px 70px rgba(63, 38, 15, 0.16); }
    .header { display: flex; justify-content: space-between; gap: 32px; padding: 42px 48px 30px; background: linear-gradient(135deg, #2f241a, #8a4f1d); color: white; }
    .brand h1 { margin: 0; font-size: 30px; letter-spacing: 0.04em; }
    .brand p, .invoice-meta p { margin: 6px 0 0; color: rgba(255,255,255,0.82); font-size: 13px; }
    .invoice-meta { min-width: 260px; text-align: right; }
    .invoice-meta h2 { margin: 0 0 10px; font-size: 38px; letter-spacing: 0.08em; }
    .status { display: inline-block; margin-top: 12px; padding: 7px 13px; border-radius: 999px; background: rgba(255,255,255,0.16); text-transform: uppercase; font: 700 12px Arial, sans-serif; letter-spacing: 0.12em; }
    .content { padding: 38px 48px 44px; }
    .bill-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 28px; margin-bottom: 30px; }
    .card { border: 1px solid #eadcca; background: white; padding: 20px; border-radius: 16px; }
    .label { margin: 0 0 10px; color: #a45d1f; font: 700 11px Arial, sans-serif; letter-spacing: 0.18em; text-transform: uppercase; }
    .card h3 { margin: 0 0 8px; font-size: 22px; }
    .card p { margin: 5px 0; color: #5f6b76; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 0; }
    th { background: #2f241a; color: #fff; padding: 13px 12px; text-align: left; font: 700 11px Arial, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; }
    td { border-bottom: 1px solid #eadcca; padding: 14px 12px; vertical-align: top; font-size: 14px; }
    td span { display: block; margin-top: 4px; color: #87919c; font-size: 12px; text-transform: capitalize; }
    .right { text-align: right; }
    .totals { display: grid; grid-template-columns: 1fr 320px; gap: 28px; margin-top: 28px; align-items: start; }
    .notes { color: #5f6b76; line-height: 1.55; font-size: 14px; }
    .summary { border: 1px solid #eadcca; border-radius: 16px; overflow: hidden; background: white; }
    .summary-row { display: flex; justify-content: space-between; padding: 13px 16px; border-bottom: 1px solid #eadcca; font-size: 14px; }
    .summary-row.total { background: #f97316; color: white; border: 0; font-size: 18px; font-weight: 700; }
    .payments { margin-top: 32px; }
    .footer { margin-top: 34px; padding-top: 22px; border-top: 1px solid #eadcca; color: #6b7280; font-size: 13px; text-align: center; }
    .muted { color: #87919c; }
    @media print {
      body { background: white; }
      .page { width: auto; margin: 0; box-shadow: none; border: 0; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="header">
      <div class="brand">
        <h1>${escapeHtml(branding.hospitalName)}</h1>
        <p>${escapeHtml(branding.address)}</p>
        <p>${escapeHtml(branding.phone)} · ${escapeHtml(branding.contact)}</p>
      </div>
      <div class="invoice-meta">
        <h2>INVOICE</h2>
        <p><strong>No:</strong> ${escapeHtml(invoice.invoiceNumber)}</p>
        <p><strong>Issued:</strong> ${escapeHtml(formatDate(invoice.createdAt))}</p>
        <p><strong>Due:</strong> ${escapeHtml(formatDate(invoice.dueDate))}</p>
        <span class="status">${escapeHtml(invoice.status)}</span>
      </div>
    </section>

    <section class="content">
      <div class="bill-grid">
        <div class="card">
          <p class="label">Bill To</p>
          <h3>${escapeHtml(invoice.patientName)}</h3>
          <p>${escapeHtml(invoice.patientEmail || "No email on file")}</p>
          <p>${escapeHtml(invoice.patientPhone || "No phone on file")}</p>
        </div>
        <div class="card">
          <p class="label">Payment Terms</p>
          <p>${escapeHtml(invoice.paymentTerms || "Due upon receipt")}</p>
          <p><strong>Balance due:</strong> ${money(invoice.amountDue)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th class="right">Qty</th>
            <th class="right">Unit Price</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="totals">
        <div class="notes">
          <p class="label">Notes</p>
          <p>${escapeHtml(invoice.notes || invoice.description || "Thank you for choosing our care team. Please keep this invoice for your records.")}</p>
        </div>
        <div class="summary">
          <div class="summary-row"><span>Subtotal</span><strong>${money(invoice.totalAmount)}</strong></div>
          <div class="summary-row"><span>Paid</span><strong>${money(invoice.paidAmount)}</strong></div>
          <div class="summary-row"><span>Outstanding</span><strong>${money(invoice.amountDue)}</strong></div>
          <div class="summary-row total"><span>Total Due</span><span>${money(invoice.amountDue)}</span></div>
        </div>
      </div>

      <div class="payments">
        <p class="label">Payment History</p>
        <table>
          <thead><tr><th>Date</th><th>Method</th><th>Status</th><th class="right">Amount</th></tr></thead>
          <tbody>${paymentRows}</tbody>
        </table>
      </div>

      <p class="footer">Generated from the live billing ledger. Open this file in a browser and use Print / Save as PDF if a PDF copy is needed.</p>
    </section>
  </main>
</body>
</html>`;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const { slug, id } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const invoice = await getInvoiceForDownload(tenantId, id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const branding = await getTenantBrandingSettings(tenantId);
    const html = renderInvoiceHtml(invoice, branding);
    const filename = `invoice-${String(invoice.invoiceNumber).replace(/[^a-z0-9-_]+/gi, "-")}.html`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error generating invoice download:", error);
    return NextResponse.json({ error: "Failed to generate invoice download" }, { status: 500 });
  }
}
