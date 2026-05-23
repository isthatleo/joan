import { jsPDF } from "jspdf";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { accountantReportTemplates, tenants } from "@/lib/db/schema";

type SnapshotMetric = { label: string; value: string };
type SnapshotTable = { title: string; columns: string[]; rows: string[][] };
type SnapshotSection = { title: string; description?: string; metrics?: SnapshotMetric[]; table?: SnapshotTable };

type ReportSnapshot = {
  templateKey: string;
  periodLabel: string;
  generatedAt: string;
  summary: SnapshotMetric[];
  sections: SnapshotSection[];
  highlights: string[];
};

type TenantBranding = {
  name: string;
  slug: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl: string;
};

type TemplateBrandingConfig = {
  logoUrl?: string;
  letterheadTitle?: string;
  letterheadSubtitle?: string;
  footerPrimary?: string;
  footerSecondary?: string;
  watermarkText?: string;
  coverNote?: string;
  signoffName?: string;
  signoffTitle?: string;
};

type TemplatePresentationConfig = {
  accent?: string;
  layout?: string;
  includeHighlights?: boolean;
  includeSignatureBlock?: boolean;
  includeGeneratedTimestamp?: boolean;
  branding?: TemplateBrandingConfig;
};

function numberValue(value: unknown) {
  return Number(value || 0);
}

function money(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(numberValue(value));
}

function count(value: unknown) {
  return new Intl.NumberFormat("en-US").format(numberValue(value));
}

function percent(value: unknown) {
  return `${numberValue(value).toFixed(1)}%`;
}

function periodLabel(range?: string) {
  if (range === "3months") return "Last 3 months";
  if (range === "6months") return "Last 6 months";
  if (range === "24months") return "Last 24 months";
  return "Last 12 months";
}

async function getTenantBranding(tenantId: string): Promise<TenantBranding> {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return {
    name: tenant?.name || "Hospital",
    slug: tenant?.slug || "tenant",
    address: tenant?.address || [tenant?.city, tenant?.country].filter(Boolean).join(", "),
    contactEmail: tenant?.contactEmail || "",
    contactPhone: tenant?.contactPhone || "",
    logoUrl: tenant?.logoUrl || "",
  };
}

async function datasetFinancialSummary(tenantId: string, interval: string) {
  const [row] = (await db.execute(sql`
    SELECT
      COALESCE((SELECT SUM(amount::numeric) FROM payments WHERE tenant_id = ${tenantId} AND status = 'completed' AND created_at >= CURRENT_DATE - ${interval}::interval), 0) AS revenue,
      COALESCE((SELECT SUM(amount::numeric) FROM expenses WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND expense_date >= CURRENT_DATE - ${interval}::interval), 0) AS expenses,
      COALESCE((SELECT SUM(total_amount::numeric) FROM invoices WHERE tenant_id = ${tenantId} AND status NOT IN ('paid', 'cancelled') AND created_at >= CURRENT_DATE - ${interval}::interval), 0) AS receivables,
      COALESCE((SELECT SUM((amount::numeric - amount_paid::numeric)) FROM accounts_payable WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND status <> 'paid' AND due_date >= CURRENT_DATE - ${interval}::interval), 0) AS payables
  `)).rows as any[];

  const revenue = numberValue(row?.revenue);
  const expenses = numberValue(row?.expenses);
  const receivables = numberValue(row?.receivables);
  const payables = numberValue(row?.payables);
  const profit = revenue - expenses;

  return {
    summary: [
      { label: "Revenue", value: money(revenue) },
      { label: "Expenses", value: money(expenses) },
      { label: "Net Profit", value: money(profit) },
      { label: "Receivables", value: money(receivables) },
      { label: "Payables", value: money(payables) },
    ],
    sections: [
      {
        title: "Performance Summary",
        metrics: [
          { label: "Profit Margin", value: percent(revenue > 0 ? (profit / revenue) * 100 : 0) },
          { label: "Current Ratio", value: (payables > 0 ? receivables / payables : receivables > 0 ? receivables : 0).toFixed(2) },
        ],
      },
    ],
    highlights: [
      `Net profit closed at ${money(profit)} for the selected period.`,
      `Outstanding receivables total ${money(receivables)} against payables of ${money(payables)}.`,
    ],
  };
}

async function datasetRevenueAnalysis(tenantId: string, interval: string) {
  const rows = (await db.execute(sql`
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS period,
      COALESCE(SUM(amount::numeric), 0) AS total,
      COUNT(*) AS transactions,
      COALESCE(AVG(amount::numeric), 0) AS average
    FROM payments
    WHERE tenant_id = ${tenantId}
      AND status = 'completed'
      AND created_at >= CURRENT_DATE - ${interval}::interval
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at)
  `)).rows as any[];

  const total = rows.reduce((sum, row) => sum + numberValue(row.total), 0);
  const txCount = rows.reduce((sum, row) => sum + numberValue(row.transactions), 0);
  const latest = rows.at(-1);

  return {
    summary: [
      { label: "Total Revenue", value: money(total) },
      { label: "Transactions", value: count(txCount) },
      { label: "Avg Transaction", value: money(txCount > 0 ? total / txCount : 0) },
      { label: "Latest Month", value: latest?.period || "N/A" },
    ],
    sections: [
      {
        title: "Monthly Revenue",
        table: {
          title: "Revenue by month",
          columns: ["Period", "Revenue", "Transactions", "Average"],
          rows: rows.map((row) => [row.period, money(row.total), count(row.transactions), money(row.average)]),
        },
      },
    ],
    highlights: [
      `Collected ${money(total)} across ${count(txCount)} completed payments.`,
      latest ? `Latest recorded month ${latest.period} closed at ${money(latest.total)}.` : "No completed payment records found.",
    ],
  };
}

async function datasetBilling(tenantId: string, interval: string) {
  const [summaryRow] = (await db.execute(sql`
    SELECT
      COUNT(*) AS invoices,
      COALESCE(SUM(total_amount::numeric), 0) AS billed,
      COALESCE(SUM(CASE WHEN status NOT IN ('paid', 'cancelled') THEN total_amount::numeric ELSE 0 END), 0) AS outstanding,
      COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
      COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count
    FROM invoices
    WHERE tenant_id = ${tenantId}
      AND created_at >= CURRENT_DATE - ${interval}::interval
  `)).rows as any[];

  const rows = (await db.execute(sql`
    SELECT COALESCE(status, 'draft') AS status, COUNT(*) AS count, COALESCE(SUM(total_amount::numeric), 0) AS amount_due
    FROM invoices
    WHERE tenant_id = ${tenantId}
      AND created_at >= CURRENT_DATE - ${interval}::interval
    GROUP BY 1
    ORDER BY 2 DESC
  `)).rows as any[];

  const invoices = numberValue(summaryRow?.invoices);
  const paidCount = numberValue(summaryRow?.paid_count);
  return {
    summary: [
      { label: "Invoices", value: count(invoices) },
      { label: "Billed", value: money(summaryRow?.billed) },
      { label: "Outstanding", value: money(summaryRow?.outstanding) },
      { label: "Collection Rate", value: percent(invoices > 0 ? (paidCount / invoices) * 100 : 0) },
    ],
    sections: [{
      title: "Invoice Status",
      table: {
        title: "Invoices by status",
        columns: ["Status", "Count", "Amount Due"],
        rows: rows.map((row) => [String(row.status), count(row.count), money(row.amount_due)]),
      },
    }],
    highlights: [
      `${count(invoices)} invoices were created in the selected period.`,
      `${count(summaryRow?.overdue_count)} invoices are currently overdue.`,
    ],
  };
}

async function datasetInvoiceAging(tenantId: string, interval: string) {
  const rows = (await db.execute(sql`
    SELECT
      CASE
        WHEN created_at >= CURRENT_DATE - interval '30 days' THEN '0-30 days'
        WHEN created_at >= CURRENT_DATE - interval '60 days' THEN '31-60 days'
        WHEN created_at >= CURRENT_DATE - interval '90 days' THEN '61-90 days'
        ELSE '90+ days'
      END AS bucket,
      COUNT(*) AS invoices,
      COALESCE(SUM(total_amount::numeric), 0) AS balance
    FROM invoices
    WHERE tenant_id = ${tenantId}
      AND status NOT IN ('paid', 'cancelled')
      AND created_at >= CURRENT_DATE - ${interval}::interval
    GROUP BY 1
    ORDER BY 1
  `)).rows as any[];

  return {
    summary: [
      { label: "Open Invoices", value: count(rows.reduce((sum, row) => sum + numberValue(row.invoices), 0)) },
      { label: "Open Balance", value: money(rows.reduce((sum, row) => sum + numberValue(row.balance), 0)) },
      { label: "Buckets", value: count(rows.length) },
    ],
    sections: [{
      title: "Receivables Aging",
      table: {
        title: "Invoice aging by creation period",
        columns: ["Bucket", "Invoices", "Balance"],
        rows: rows.map((row) => [String(row.bucket), count(row.invoices), money(row.balance)]),
      },
    }],
    highlights: [rows[0] ? `${rows[0].bucket} contains ${count(rows[0].invoices)} open invoices.` : "No open invoices found for the selected period."],
  };
}

async function datasetCollectionsPerformance(tenantId: string, interval: string) {
  const [row] = (await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'paid') AS paid_invoices,
      COUNT(*) FILTER (WHERE status NOT IN ('paid', 'cancelled')) AS open_invoices,
      COALESCE(SUM(CASE WHEN status NOT IN ('paid', 'cancelled') THEN total_amount::numeric ELSE 0 END), 0) AS open_balance
    FROM invoices
    WHERE tenant_id = ${tenantId}
      AND created_at >= CURRENT_DATE - ${interval}::interval
  `)).rows as any[];

  const [paymentRow] = (await db.execute(sql`
    SELECT
      COUNT(*) AS completed_payments,
      COALESCE(SUM(amount::numeric), 0) AS collected_value
    FROM payments
    WHERE tenant_id = ${tenantId}
      AND status = 'completed'
      AND created_at >= CURRENT_DATE - ${interval}::interval
  `)).rows as any[];

  const paidInvoices = numberValue(row?.paid_invoices);
  const openInvoices = numberValue(row?.open_invoices);
  const invoiceCount = paidInvoices + openInvoices;

  return {
    summary: [
      { label: "Collected", value: money(paymentRow?.collected_value) },
      { label: "Completed Payments", value: count(paymentRow?.completed_payments) },
      { label: "Open Balance", value: money(row?.open_balance) },
      { label: "Invoice Close Rate", value: percent(invoiceCount > 0 ? (paidInvoices / invoiceCount) * 100 : 0) },
    ],
    sections: [{
      title: "Collections Snapshot",
      metrics: [
        { label: "Paid Invoices", value: count(paidInvoices) },
        { label: "Open Invoices", value: count(openInvoices) },
      ],
    }],
    highlights: [`Collected ${money(paymentRow?.collected_value)} during the selected period.`],
  };
}

async function datasetClaims(tenantId: string, interval: string) {
  const [summaryRow] = (await db.execute(sql`
    SELECT
      COUNT(*) AS claims,
      COALESCE(SUM(claim_amount), 0) AS claim_amount,
      COALESCE(SUM(approved_amount), 0) AS approved_amount,
      COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
      COUNT(*) FILTER (WHERE status = 'denied') AS denied_count
    FROM claims
    WHERE tenant_id = ${tenantId}
      AND submitted_at >= CURRENT_DATE - ${interval}::interval
  `)).rows as any[];

  const rows = (await db.execute(sql`
    SELECT COALESCE(status, 'pending') AS status, COUNT(*) AS count, COALESCE(SUM(claim_amount), 0) AS amount
    FROM claims
    WHERE tenant_id = ${tenantId}
      AND submitted_at >= CURRENT_DATE - ${interval}::interval
    GROUP BY 1
    ORDER BY 2 DESC
  `)).rows as any[];

  const claims = numberValue(summaryRow?.claims);
  const approved = numberValue(summaryRow?.approved_count);
  return {
    summary: [
      { label: "Claims", value: count(claims) },
      { label: "Submitted Value", value: money(summaryRow?.claim_amount) },
      { label: "Approved Value", value: money(summaryRow?.approved_amount) },
      { label: "Approval Rate", value: percent(claims > 0 ? (approved / claims) * 100 : 0) },
    ],
    sections: [{
      title: "Claims by Status",
      table: {
        title: "Claims status breakdown",
        columns: ["Status", "Claims", "Amount"],
        rows: rows.map((row) => [String(row.status), count(row.count), money(row.amount)]),
      },
    }],
    highlights: [
      `${count(summaryRow?.denied_count)} claims were denied in the selected period.`,
      `Approved claim value totals ${money(summaryRow?.approved_amount)}.`,
    ],
  };
}

async function datasetExpenseSummary(tenantId: string, interval: string) {
  const rows = (await db.execute(sql`
    SELECT COALESCE(category, 'Uncategorized') AS category, COALESCE(SUM(amount::numeric), 0) AS total, COUNT(*) AS entries
    FROM expenses
    WHERE tenant_id = ${tenantId}
      AND deleted_at IS NULL
      AND expense_date >= CURRENT_DATE - ${interval}::interval
    GROUP BY 1
    ORDER BY total DESC
  `)).rows as any[];
  const total = rows.reduce((sum, row) => sum + numberValue(row.total), 0);
  return {
    summary: [
      { label: "Expense Total", value: money(total) },
      { label: "Categories", value: count(rows.length) },
      { label: "Entries", value: count(rows.reduce((sum, row) => sum + numberValue(row.entries), 0)) },
    ],
    sections: [{
      title: "Expense Categories",
      table: {
        title: "Expense totals by category",
        columns: ["Category", "Entries", "Total"],
        rows: rows.map((row) => [String(row.category), count(row.entries), money(row.total)]),
      },
    }],
    highlights: [rows[0] ? `Top category ${rows[0].category} accounts for ${money(rows[0].total)}.` : "No expense data recorded."],
  };
}

async function datasetBudgetVsActual(tenantId: string) {
  const rows = (await db.execute(sql`
    SELECT name, period, amount, spent, CASE WHEN amount::numeric > 0 THEN ROUND((spent::numeric / amount::numeric) * 100, 1) ELSE 0 END AS utilization
    FROM budgets
    WHERE tenant_id = ${tenantId}
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 20
  `)).rows as any[];
  return {
    summary: [
      { label: "Budgets", value: count(rows.length) },
      { label: "Planned", value: money(rows.reduce((sum, row) => sum + numberValue(row.amount), 0)) },
      { label: "Spent", value: money(rows.reduce((sum, row) => sum + numberValue(row.spent), 0)) },
    ],
    sections: [{
      title: "Budget Lines",
      table: {
        title: "Budget performance",
        columns: ["Budget", "Period", "Amount", "Spent", "Utilization"],
        rows: rows.map((row) => [String(row.name), String(row.period), money(row.amount), money(row.spent), percent(row.utilization)]),
      },
    }],
    highlights: ["Budget utilization is based on current stored spend against allocated amount."],
  };
}

async function datasetPaymentMethods(tenantId: string, interval: string) {
  const rows = (await db.execute(sql`
    SELECT COALESCE(method, 'unknown') AS method, COUNT(*) AS transactions, COALESCE(SUM(amount::numeric), 0) AS total
    FROM payments
    WHERE tenant_id = ${tenantId}
      AND created_at >= CURRENT_DATE - ${interval}::interval
    GROUP BY 1
    ORDER BY total DESC
  `)).rows as any[];
  return {
    summary: [
      { label: "Methods", value: count(rows.length) },
      { label: "Transactions", value: count(rows.reduce((sum, row) => sum + numberValue(row.transactions), 0)) },
      { label: "Volume", value: money(rows.reduce((sum, row) => sum + numberValue(row.total), 0)) },
    ],
    sections: [{
      title: "Payment Method Mix",
      table: {
        title: "Payment methods",
        columns: ["Method", "Transactions", "Volume"],
        rows: rows.map((row) => [String(row.method), count(row.transactions), money(row.total)]),
      },
    }],
    highlights: [rows[0] ? `${rows[0].method} is the highest-volume payment method.` : "No payment method data available."],
  };
}

async function datasetPatientFinancial(tenantId: string) {
  const rows = (await db.execute(sql`
    SELECT
      COALESCE(
        NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), ''),
        'Patient'
      ) AS patient_name,
      COUNT(i.id) AS invoices,
      COALESCE(SUM(i.total_amount::numeric), 0) AS outstanding
    FROM invoices i
    LEFT JOIN patients p ON p.id = i.patient_id
    WHERE i.tenant_id = ${tenantId}
      AND i.status NOT IN ('paid', 'cancelled')
    GROUP BY 1
    ORDER BY outstanding DESC
    LIMIT 20
  `)).rows as any[];
  return {
    summary: [
      { label: "Patients with Balance", value: count(rows.length) },
      { label: "Outstanding Balance", value: money(rows.reduce((sum, row) => sum + numberValue(row.outstanding), 0)) },
    ],
    sections: [{
      title: "Top Outstanding Balances",
      table: {
        title: "Patient balances",
        columns: ["Patient", "Invoices", "Outstanding"],
        rows: rows.map((row) => [String(row.patient_name), count(row.invoices), money(row.outstanding)]),
      },
    }],
    highlights: [rows[0] ? `${rows[0].patient_name} has the highest current outstanding balance.` : "No outstanding patient balances found."],
  };
}

async function datasetPayables(tenantId: string) {
  const rows = (await db.execute(sql`
    SELECT
      COALESCE(vendor, 'Vendor') AS vendor,
      COALESCE(amount::numeric - amount_paid::numeric, 0) AS balance,
      CASE
        WHEN due_date < CURRENT_DATE THEN 'Overdue'
        WHEN due_date <= CURRENT_DATE + interval '30 days' THEN '0-30 days'
        WHEN due_date <= CURRENT_DATE + interval '60 days' THEN '31-60 days'
        ELSE '61+ days'
      END AS bucket
    FROM accounts_payable
    WHERE tenant_id = ${tenantId}
      AND deleted_at IS NULL
      AND status <> 'paid'
    ORDER BY balance DESC
    LIMIT 25
  `)).rows as any[];
  return {
    summary: [
      { label: "Open Payables", value: count(rows.length) },
      { label: "Outstanding", value: money(rows.reduce((sum, row) => sum + numberValue(row.balance), 0)) },
    ],
    sections: [{
      title: "Aging Detail",
      table: {
        title: "Payables aging",
        columns: ["Vendor", "Bucket", "Balance"],
        rows: rows.map((row) => [String(row.vendor), String(row.bucket), money(row.balance)]),
      },
    }],
    highlights: ["Aging buckets are based on payable due dates relative to today."],
  };
}

async function datasetTaxSummary(tenantId: string) {
  const rows = (await db.execute(sql`
    SELECT COALESCE(tax_type, 'Tax') AS tax_type, COALESCE(SUM(tax_amount::numeric), 0) AS total, COUNT(*) AS entries, COALESCE(MAX(status), 'pending') AS status
    FROM tax_records
    WHERE tenant_id = ${tenantId}
      AND deleted_at IS NULL
    GROUP BY 1
    ORDER BY total DESC
  `)).rows as any[];
  return {
    summary: [
      { label: "Tax Categories", value: count(rows.length) },
      { label: "Liability", value: money(rows.reduce((sum, row) => sum + numberValue(row.total), 0)) },
    ],
    sections: [{
      title: "Tax Overview",
      table: {
        title: "Tax records",
        columns: ["Type", "Entries", "Amount", "Status"],
        rows: rows.map((row) => [String(row.tax_type), count(row.entries), money(row.total), String(row.status)]),
      },
    }],
    highlights: ["Tax summary uses stored tax records for the current tenant."],
  };
}

async function datasetJournalAudit(tenantId: string, interval: string) {
  const rows = (await db.execute(sql`
    SELECT entry_date, COALESCE(reference, '-') AS reference, COALESCE(description, '-') AS description, debit_account, credit_account, amount::numeric AS amount
    FROM journal_entries
    WHERE tenant_id = ${tenantId}
      AND deleted_at IS NULL
      AND entry_date >= CURRENT_DATE - ${interval}::interval
    ORDER BY entry_date DESC
    LIMIT 25
  `)).rows as any[];
  return {
    summary: [
      { label: "Journal Entries", value: count(rows.length) },
      { label: "Posted Amount", value: money(rows.reduce((sum, row) => sum + numberValue(row.amount), 0)) },
    ],
    sections: [{
      title: "Recent Posting Activity",
      table: {
        title: "Journal entries",
        columns: ["Date", "Reference", "Description", "Debit", "Credit", "Amount"],
        rows: rows.map((row) => [String(row.entry_date).slice(0, 10), String(row.reference), String(row.description), String(row.debit_account), String(row.credit_account), money(row.amount)]),
      },
    }],
    highlights: ["This report surfaces the most recent journal activity in the selected period."],
  };
}

async function datasetCashFlow(tenantId: string, interval: string) {
  const [row] = (await db.execute(sql`
    SELECT
      COALESCE((SELECT SUM(amount::numeric) FROM payments WHERE tenant_id = ${tenantId} AND status = 'completed' AND created_at >= CURRENT_DATE - ${interval}::interval), 0)
      - COALESCE((SELECT SUM(amount::numeric) FROM expenses WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND expense_date >= CURRENT_DATE - ${interval}::interval), 0) AS operating,
      COALESCE((SELECT SUM(amount::numeric) FROM expenses WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND expense_date >= CURRENT_DATE - ${interval}::interval AND LOWER(COALESCE(category, '')) IN ('equipment', 'capital', 'capital expenditure', 'investment', 'infrastructure')), 0) AS investing,
      COALESCE((SELECT SUM(amount::numeric) FROM journal_entries WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND entry_date >= CURRENT_DATE - ${interval}::interval AND (LOWER(COALESCE(credit_account, '')) ~ '(loan|equity|capital|financing)' OR LOWER(COALESCE(debit_account, '')) ~ '(loan|equity|capital|financing)')), 0) AS financing
  `)).rows as any[];
  const operating = numberValue(row?.operating);
  const investing = -Math.abs(numberValue(row?.investing));
  const financing = numberValue(row?.financing);
  return {
    summary: [
      { label: "Operating", value: money(operating) },
      { label: "Investing", value: money(investing) },
      { label: "Financing", value: money(financing) },
      { label: "Net Cash Flow", value: money(operating + investing + financing) },
    ],
    sections: [],
    highlights: ["Operating cash flow is derived from completed payments minus booked expenses."],
  };
}

async function buildDataset(tenantId: string, templateKey: string, interval: string) {
  switch (templateKey) {
    case "financial-summary": return datasetFinancialSummary(tenantId, interval);
    case "monthly-close-pack": return datasetFinancialSummary(tenantId, interval);
    case "revenue-analysis": return datasetRevenueAnalysis(tenantId, interval);
    case "collections-performance": return datasetCollectionsPerformance(tenantId, interval);
    case "invoice-aging":
    case "ar-watchlist": return datasetInvoiceAging(tenantId, interval);
    case "billing-report": return datasetBilling(tenantId, interval);
    case "insurance-claims":
    case "denial-recovery": return datasetClaims(tenantId, interval);
    case "expense-summary":
    case "vendor-spend-analysis": return datasetExpenseSummary(tenantId, interval);
    case "budget-vs-actual": return datasetBudgetVsActual(tenantId);
    case "payment-methods": return datasetPaymentMethods(tenantId, interval);
    case "patient-financial": return datasetPatientFinancial(tenantId);
    case "accounts-payable-aging": return datasetPayables(tenantId);
    case "tax-summary": return datasetTaxSummary(tenantId);
    case "journal-audit": return datasetJournalAudit(tenantId, interval);
    case "cash-flow": return datasetCashFlow(tenantId, interval);
    case "cash-flow-statement":
    case "cash-position-brief": return datasetCashFlow(tenantId, interval);
    default: return datasetFinancialSummary(tenantId, interval);
  }
}

export async function buildReportSnapshot(args: { tenantId: string; templateKey: string; range?: string | null }) {
  const interval = args.range === "3months" ? "3 months" : args.range === "6months" ? "6 months" : args.range === "24months" ? "24 months" : "12 months";
  const data = await buildDataset(args.tenantId, args.templateKey, interval);

  return {
    templateKey: args.templateKey,
    periodLabel: periodLabel(args.range || undefined),
    generatedAt: new Date().toISOString(),
    summary: data.summary,
    sections: data.sections,
    highlights: data.highlights,
  } satisfies ReportSnapshot;
}

export async function getReportTemplateById(templateId: string) {
  const [template] = await db.select().from(accountantReportTemplates).where(eq(accountantReportTemplates.id, templateId)).limit(1);
  return template || null;
}

export async function getReportBranding(tenantId: string) {
  return getTenantBranding(tenantId);
}

export function renderReportHtml(args: {
  branding: TenantBranding;
  reportName: string;
  reportType: string;
  description?: string | null;
  snapshot: ReportSnapshot;
  templateConfig?: TemplatePresentationConfig;
}) {
  const accent = args.templateConfig?.accent || "#f97316";
  const brandConfig = args.templateConfig?.branding || {};
  const includeHighlights = args.templateConfig?.includeHighlights !== false;
  const includeSignatureBlock = args.templateConfig?.includeSignatureBlock === true;
  const includeGeneratedTimestamp = args.templateConfig?.includeGeneratedTimestamp !== false;
  const reportLead = brandConfig.coverNote || args.description || "Generated from live tenant accounting data";
  const summaryCards = args.snapshot.summary
    .map((metric) => `<div class="metric"><span>${metric.label}</span><strong>${metric.value}</strong></div>`)
    .join("");
  const highlights = args.snapshot.highlights.map((item) => `<li>${item}</li>`).join("");
  const sections = args.snapshot.sections
    .map((section) => {
      const metrics = (section.metrics || [])
        .map((metric) => `<div class="metric small"><span>${metric.label}</span><strong>${metric.value}</strong></div>`)
        .join("");
      const table = section.table
        ? `<table><thead><tr>${section.table.columns.map((column) => `<th>${column}</th>`).join("")}</tr></thead><tbody>${section.table.rows
            .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`
        : "";
      return `<section><h2>${section.title}</h2>${section.description ? `<p>${section.description}</p>` : ""}<div class="metric-grid">${metrics}</div>${table}</section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${args.reportName}</title>
<style>
html { color-scheme: light dark; }
body { font-family: Arial, sans-serif; margin: 0; color: #0f172a; background: linear-gradient(180deg, #fff7ed 0%, #f8fafc 45%, #eff6ff 100%); }
.page { position: relative; max-width: 960px; margin: 32px auto; background: white; padding: 40px 44px 56px; border-radius: 24px; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12); overflow: hidden; }
.watermark { position:absolute; top:32px; right:-24px; transform: rotate(12deg); font-size: 48px; font-weight: 800; color: rgba(148, 163, 184, 0.12); letter-spacing: .18em; }
.header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 3px solid ${accent}; padding-bottom: 20px; margin-bottom: 24px; }
.branding h1 { margin: 0; font-size: 28px; }
.branding p, .meta p { margin: 4px 0; color: #475569; }
.badge { display:inline-block; background:${accent}1f; color:${accent}; padding:6px 10px; border-radius:999px; font-size:12px; font-weight:700; margin-bottom:12px; }
.cover-note { margin: 0 0 20px; padding: 16px 18px; border-radius: 18px; background:${accent}12; color:#334155; }
.summary { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 20px 0 28px; }
.metric { border:1px solid ${accent}30; background:${accent}10; border-radius:14px; padding:14px; display:flex; flex-direction:column; gap:6px; }
.metric.small { background:#ffffff; border-color:#e2e8f0; }
.metric span { font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:#64748b; }
.metric strong { font-size:20px; }
.metric-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
section { margin: 28px 0; }
section h2 { margin: 0 0 12px; font-size: 18px; }
table { width:100%; border-collapse: collapse; margin-top: 12px; }
th, td { border:1px solid #e2e8f0; padding:10px 12px; text-align:left; font-size:13px; }
thead th { background:#f8fafc; }
.footer { margin-top: 32px; border-top:1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color:#64748b; display:flex; justify-content:space-between; }
.signoff { margin-top: 24px; padding: 18px; border: 1px dashed #cbd5e1; border-radius: 18px; }
ul { padding-left: 18px; color:#334155; }
@media (max-width: 720px) {
  .page { margin: 0; border-radius: 0; padding: 24px 18px 36px; }
  .header { flex-direction: column; gap: 16px; }
  .summary { grid-template-columns: 1fr; }
  .metric-grid { grid-template-columns: 1fr; }
  .footer { flex-direction: column; gap: 8px; }
  .watermark { right: -40px; font-size: 32px; }
}
@media (prefers-color-scheme: dark) {
  body { color: #e5e7eb; background: linear-gradient(180deg, #0f172a 0%, #111827 45%, #1e293b 100%); }
  .page { background: #0f172a; box-shadow: 0 18px 45px rgba(2, 6, 23, 0.55); }
  .branding p, .meta p, .cover-note, ul, .footer { color: #cbd5e1; }
  .metric { border-color: rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); }
  .metric.small { background: #111827; border-color: #334155; }
  .metric span { color: #94a3b8; }
  section h2, .branding h1, .meta strong { color: #f8fafc; }
  table, th, td { border-color: #334155; }
  thead th { background: #111827; color: #cbd5e1; }
  td { color: #e2e8f0; }
  .signoff { border-color: #475569; }
  .footer { border-top-color: #334155; }
}
</style>
</head>
<body>
  <div class="page">
    ${brandConfig.watermarkText ? `<div class="watermark">${brandConfig.watermarkText}</div>` : ""}
    <div class="header">
      <div class="branding">
        <div class="badge">${args.reportType.toUpperCase()} REPORT</div>
        <h1>${args.branding.name}</h1>
        <p>${brandConfig.letterheadTitle || args.branding.address || args.branding.slug}</p>
        ${brandConfig.letterheadSubtitle ? `<p>${brandConfig.letterheadSubtitle}</p>` : ""}
        <p>${args.branding.contactEmail}${args.branding.contactPhone ? ` | ${args.branding.contactPhone}` : ""}</p>
      </div>
      <div class="meta">
        <p><strong>${args.reportName}</strong></p>
        <p>${reportLead}</p>
        <p>Period: ${args.snapshot.periodLabel}</p>
        ${includeGeneratedTimestamp ? `<p>Generated: ${new Date(args.snapshot.generatedAt).toLocaleString()}</p>` : ""}
      </div>
    </div>
    <p class="cover-note">${reportLead}</p>
    <div class="summary">${summaryCards}</div>
    ${includeHighlights ? `<section>
      <h2>Highlights</h2>
      <ul>${highlights}</ul>
    </section>` : ""}
    ${sections}
    ${includeSignatureBlock ? `<div class="signoff"><strong>${brandConfig.signoffName || "Chief Financial Officer"}</strong><div>${brandConfig.signoffTitle || "Finance Leadership"}</div></div>` : ""}
    <div class="footer">
      <span>${brandConfig.footerPrimary || `${args.branding.name} financial reporting`}</span>
      <span>${brandConfig.footerSecondary || `Prepared on ${new Date(args.snapshot.generatedAt).toLocaleDateString()}`}</span>
    </div>
  </div>
</body>
</html>`;
}

export function renderReportCsv(snapshot: ReportSnapshot) {
  const lines = ["Section,Label,Value"];
  for (const metric of snapshot.summary) {
    lines.push(`Summary,${JSON.stringify(metric.label)},${JSON.stringify(metric.value)}`);
  }
  for (const section of snapshot.sections) {
    if (section.metrics) {
      for (const metric of section.metrics) {
        lines.push(`${JSON.stringify(section.title)},${JSON.stringify(metric.label)},${JSON.stringify(metric.value)}`);
      }
    }
    if (section.table) {
      lines.push("");
      lines.push(section.table.columns.join(","));
      for (const row of section.table.rows) {
        lines.push(row.map((cell) => JSON.stringify(cell)).join(","));
      }
    }
  }
  return lines.join("\n");
}

export function renderReportPdf(args: {
  branding: TenantBranding;
  reportName: string;
  reportType: string;
  description?: string | null;
  snapshot: ReportSnapshot;
  templateConfig?: TemplatePresentationConfig;
}) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  let y = 58;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const left = 46;
  const right = pageWidth - 46;
  const contentWidth = right - left;
  const accent = args.templateConfig?.accent || "#f97316";
  const brandConfig = args.templateConfig?.branding || {};
  const includeHighlights = args.templateConfig?.includeHighlights !== false;
  const includeSignatureBlock = args.templateConfig?.includeSignatureBlock === true;
  const includeGeneratedTimestamp = args.templateConfig?.includeGeneratedTimestamp !== false;
  const lead = brandConfig.coverNote || args.description || "Generated from live tenant accounting data";

  const ensureSpace = (needed = 28) => {
    if (y + needed > pageHeight - 54) {
      pdf.addPage();
      pdf.setFillColor(248, 250, 252);
      pdf.rect(24, 24, pageWidth - 48, pageHeight - 48, "F");
      y = 58;
    }
  };

  pdf.setFillColor(248, 250, 252);
  pdf.rect(24, 24, pageWidth - 48, pageHeight - 48, "F");
  pdf.setDrawColor(226, 232, 240);
  pdf.setFillColor(
    parseInt(accent.slice(1, 3), 16),
    parseInt(accent.slice(3, 5), 16),
    parseInt(accent.slice(5, 7), 16)
  );
  pdf.roundedRect(32, 32, pageWidth - 64, pageHeight - 64, 18, 18, "S");
  pdf.rect(left, 36, contentWidth, 6, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(args.branding.name, left, y);
  y += 18;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(brandConfig.letterheadTitle || args.branding.address || args.branding.slug, left, y);
  y += 14;
  if (brandConfig.letterheadSubtitle) {
    pdf.text(brandConfig.letterheadSubtitle, left, y);
    y += 14;
  }
  if (args.branding.contactEmail || args.branding.contactPhone) {
    pdf.text([args.branding.contactEmail, args.branding.contactPhone].filter(Boolean).join(" | "), left, y);
    y += 18;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(args.reportName, left, y);
  y += 18;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Type: ${args.reportType} | Period: ${args.snapshot.periodLabel}`, left, y);
  y += 14;
  if (includeGeneratedTimestamp) {
    pdf.text(`Generated: ${new Date(args.snapshot.generatedAt).toLocaleString()}`, left, y);
    y += 14;
  }
  const coverLines = pdf.splitTextToSize(lead, contentWidth - 18);
  pdf.setFillColor(255, 247, 237);
  pdf.roundedRect(left, y, contentWidth, coverLines.length * 12 + 18, 14, 14, "F");
  pdf.text(coverLines, left + 10, y + 16);
  y += coverLines.length * 12 + 30;

  pdf.setFont("helvetica", "bold");
  pdf.text("Summary", left, y);
  y += 16;
  pdf.setFont("helvetica", "normal");
  for (const metric of args.snapshot.summary) {
    ensureSpace();
    pdf.text(`${metric.label}: ${metric.value}`, left + 12, y);
    y += 14;
  }

  if (includeHighlights) {
    ensureSpace(36);
    pdf.setFont("helvetica", "bold");
    pdf.text("Highlights", left, y);
    y += 16;
    pdf.setFont("helvetica", "normal");
    for (const item of args.snapshot.highlights) {
      const lines = pdf.splitTextToSize(`- ${item}`, contentWidth - 12);
      ensureSpace(lines.length * 12 + 8);
      pdf.text(lines, left + 12, y);
      y += lines.length * 12;
    }
  }

  for (const section of args.snapshot.sections) {
    ensureSpace(24);
    pdf.setFont("helvetica", "bold");
    pdf.text(section.title, left, y);
    y += 16;
    pdf.setFont("helvetica", "normal");

    for (const metric of section.metrics || []) {
      ensureSpace();
      pdf.text(`${metric.label}: ${metric.value}`, left + 12, y);
      y += 14;
    }

    if (section.table) {
      ensureSpace(24);
      pdf.setFontSize(9);
      pdf.text(section.table.columns.join(" | "), left + 12, y);
      y += 12;
      for (const row of section.table.rows) {
        const line = row.join(" | ");
        const lines = pdf.splitTextToSize(line, contentWidth - 12);
        ensureSpace(lines.length * 11 + 6);
        pdf.text(lines, left + 12, y);
        y += lines.length * 11;
      }
      pdf.setFontSize(10);
    }
  }

  if (includeSignatureBlock) {
    ensureSpace(52);
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(left, y, contentWidth, 44, 12, 12, "S");
    pdf.setFont("helvetica", "bold");
    pdf.text(brandConfig.signoffName || "Chief Financial Officer", left + 12, y + 20);
    pdf.setFont("helvetica", "normal");
    pdf.text(brandConfig.signoffTitle || "Finance Leadership", left + 12, y + 34);
    y += 58;
  }

  ensureSpace(26);
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text(brandConfig.footerPrimary || `${args.branding.name} financial reporting`, left, pageHeight - 42);
  pdf.text(brandConfig.footerSecondary || `Prepared on ${new Date(args.snapshot.generatedAt).toLocaleDateString()}`, right, pageHeight - 42, { align: "right" });

  return pdf.output("arraybuffer");
}
