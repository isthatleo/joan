import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { accountantReportTemplates, accountantReports, scheduledAccountantReports } from "@/lib/db/schema";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REPORT_TEMPLATES = [
  { key: "executive-revenue-summary", name: "Executive Revenue Summary", category: "Executive", description: "Topline revenue, collection rate, outstanding balances, and payer mix.", defaultFormat: "pdf" },
  { key: "payer-performance", name: "Payer Performance Report", category: "Insurance", description: "Insurance revenue, claim approval performance, denials, and reimbursement exposure.", defaultFormat: "pdf" },
  { key: "department-revenue", name: "Department Revenue Report", category: "Operations", description: "Revenue grouped by invoice/service description and patient volume indicators.", defaultFormat: "pdf" },
  { key: "collections-aging", name: "Collections Aging Report", category: "Finance", description: "Open invoices, amount due, overdue balances, and collection effectiveness.", defaultFormat: "pdf" },
  { key: "payment-method-audit", name: "Payment Method Audit", category: "Controls", description: "Cash, card, insurance, bank transfer, and other payment method breakdown.", defaultFormat: "pdf" },
  { key: "monthly-board-pack", name: "Monthly Board Pack", category: "Board", description: "Formatted board-ready pack with revenue, claims, collections, and risk notes.", defaultFormat: "pdf" },
  { key: "profitability-snapshot", name: "Profitability Snapshot", category: "Finance", description: "Paid revenue less approved/paid operating expenses for the selected period.", defaultFormat: "pdf" },
  { key: "daily-cash-report", name: "Daily Cash Report", category: "Treasury", description: "Completed payments and payment method controls for daily reconciliation.", defaultFormat: "pdf" },
  { key: "weekly-cfo-brief", name: "Weekly CFO Brief", category: "Executive", description: "Concise weekly revenue, cash, outstanding, and exception summary for leadership.", defaultFormat: "pdf" },
  { key: "cashflow-forecast", name: "Cashflow Forecast", category: "Treasury", description: "Expected inflows from claims, open invoices, and historical payment velocity.", defaultFormat: "pdf" },
  { key: "insurance-reimbursement-lag", name: "Insurance Reimbursement Lag", category: "Insurance", description: "Lag between claim submission, approval, and payment by payer.", defaultFormat: "pdf" },
  { key: "denial-impact-analysis", name: "Denial Impact Analysis", category: "Insurance", description: "Denied claims, financial impact, appeal exposure, and payer concentration.", defaultFormat: "pdf" },
  { key: "service-line-margin", name: "Service Line Margin", category: "Profitability", description: "Revenue, expenses, net position, and average patient value by service line.", defaultFormat: "pdf" },
  { key: "patient-revenue-cohort", name: "Patient Revenue Cohort", category: "Patients", description: "Revenue grouped by new, returning, active, and high-value patient cohorts.", defaultFormat: "pdf" },
  { key: "doctor-revenue-productivity", name: "Doctor Revenue Productivity", category: "Operations", description: "Revenue and appointment throughput signals by clinical provider.", defaultFormat: "pdf" },
  { key: "department-budget-variance", name: "Department Budget Variance", category: "Budgeting", description: "Department revenue and expense variance against expected budget posture.", defaultFormat: "pdf" },
  { key: "expense-recovery-report", name: "Expense Recovery Report", category: "Finance", description: "Revenue against operating expense categories with recovery ratio analysis.", defaultFormat: "pdf" },
  { key: "outstanding-invoice-aging", name: "Outstanding Invoice Aging", category: "Collections", description: "Current, 1-30 day, and 30+ day outstanding invoice exposure.", defaultFormat: "pdf" },
  { key: "payment-reconciliation-pack", name: "Payment Reconciliation Pack", category: "Controls", description: "Payment methods, completed transactions, voids, and reconciliation signals.", defaultFormat: "pdf" },
  { key: "revenue-leakage-review", name: "Revenue Leakage Review", category: "Controls", description: "Unpaid invoices, denied claims, and weak collection areas requiring review.", defaultFormat: "pdf" },
  { key: "quarterly-board-revenue", name: "Quarterly Board Revenue Report", category: "Board", description: "Quarter-ready revenue narrative with growth, collections, claims, and risks.", defaultFormat: "pdf" },
  { key: "annual-revenue-statement", name: "Annual Revenue Statement", category: "Statutory", description: "Annualized revenue, collections, expenses, and payer/service composition.", defaultFormat: "pdf" },
  { key: "payer-contract-review", name: "Payer Contract Review", category: "Insurance", description: "Payer mix, approved reimbursement, collection rate, and denial patterns.", defaultFormat: "pdf" },
  { key: "self-pay-performance", name: "Self-Pay Performance", category: "Collections", description: "Cash and card collections, invoice aging, and self-pay payment trends.", defaultFormat: "pdf" },
  { key: "executive-exception-report", name: "Executive Exception Report", category: "Executive", description: "Highlights only: overdue revenue, denial spikes, negative margin, and risk notes.", defaultFormat: "pdf" },
  { key: "audit-ready-finance-pack", name: "Audit-Ready Finance Pack", category: "Controls", description: "Revenue figures, payment mix, claim totals, and audit-ready reconciliation notes.", defaultFormat: "pdf" },
];

async function getTemplates(tenantId: string) {
  const customRows = await db
    .select({
      key: accountantReportTemplates.key,
      name: accountantReportTemplates.name,
      category: accountantReportTemplates.category,
      description: accountantReportTemplates.description,
      config: accountantReportTemplates.config,
      createdAt: accountantReportTemplates.createdAt,
    })
    .from(accountantReportTemplates)
    .where(and(eq(accountantReportTemplates.tenantId, tenantId), eq(accountantReportTemplates.type, "revenue"), isNull(accountantReportTemplates.deletedAt)))
    .orderBy(desc(accountantReportTemplates.createdAt));

  const customTemplates = customRows.map((row) => ({
    key: row.key,
    name: row.name,
    category: row.category,
    description: row.description || "Custom revenue report template.",
    defaultFormat: ((row.config as any)?.defaultFormat as string) || "pdf",
    isCustom: true,
  }));

  return [...REPORT_TEMPLATES.map((template) => ({ ...template, isCustom: false })), ...customTemplates];
}

function rangeMonths(range: string) {
  if (range === "3m") return 3;
  if (range === "6m") return 6;
  if (range === "1y" || range === "12m") return 12;
  return 12;
}

function num(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

async function buildRevenuePayload(tenantId: string, range: string) {
  const months = rangeMonths(range);
  const [templates, summaryRows, trendRows, methodRows, serviceRows, claimRows, expenseRows, agingRows] = await Promise.all([
    getTemplates(tenantId),
    db.execute(sql`
      SELECT
        COALESCE(SUM(p.amount::numeric) FILTER (WHERE p.status = 'completed'), 0) AS total_revenue,
        COUNT(*) FILTER (WHERE p.status = 'completed')::int AS transactions,
        COALESCE(AVG(p.amount::numeric) FILTER (WHERE p.status = 'completed'), 0) AS average_transaction,
        COALESCE(SUM(i.amount_due::numeric), 0) AS outstanding
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE p.tenant_id = ${tenantId}
        AND p.deleted_at IS NULL
        AND p.created_at >= NOW() - (${months}::text || ' months')::interval
    `),
    db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', month), 'Mon YYYY') AS month,
        COALESCE(SUM(p.amount::numeric) FILTER (WHERE p.status = 'completed'), 0) AS revenue,
        COUNT(p.id) FILTER (WHERE p.status = 'completed')::int AS transactions
      FROM generate_series(DATE_TRUNC('month', CURRENT_DATE) - (${months - 1}::text || ' months')::interval, DATE_TRUNC('month', CURRENT_DATE), '1 month') AS months(month)
      LEFT JOIN payments p ON p.tenant_id = ${tenantId} AND p.deleted_at IS NULL AND DATE_TRUNC('month', p.created_at) = month
      GROUP BY month
      ORDER BY month
    `),
    db.execute(sql`
      SELECT COALESCE(method, 'unknown') AS method, COALESCE(SUM(amount::numeric), 0) AS amount, COUNT(*)::int AS count
      FROM payments
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND status = 'completed' AND created_at >= NOW() - (${months}::text || ' months')::interval
      GROUP BY method
      ORDER BY amount DESC
    `),
    db.execute(sql`
      SELECT COALESCE(NULLIF(i.description, ''), 'General services') AS service, COALESCE(SUM(p.amount::numeric), 0) AS revenue, COUNT(DISTINCT i.patient_id)::int AS patients
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE p.tenant_id = ${tenantId} AND p.deleted_at IS NULL AND p.status = 'completed' AND p.created_at >= NOW() - (${months}::text || ' months')::interval
      GROUP BY service
      ORDER BY revenue DESC
      LIMIT 10
    `),
    db.execute(sql`
      SELECT
        COUNT(*)::int AS total_claims,
        COUNT(*) FILTER (WHERE status IN ('approved', 'paid'))::int AS approved_claims,
        COALESCE(SUM(claim_amount), 0) AS claimed,
        COALESCE(SUM(approved_amount), 0) AS approved
      FROM claims
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND created_at >= NOW() - (${months}::text || ' months')::interval
    `),
    db.execute(sql`
      SELECT COALESCE(SUM(amount), 0) AS expenses
      FROM expenses
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND expense_date >= CURRENT_DATE - (${months}::text || ' months')::interval
    `),
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE due_date >= CURRENT_DATE)::int AS current_count,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - INTERVAL '30 days')::int AS days_1_30,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '30 days')::int AS over_30,
        COALESCE(SUM(amount_due::numeric) FILTER (WHERE due_date < CURRENT_DATE), 0) AS overdue_amount
      FROM invoices
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND COALESCE(amount_due, '0')::numeric > 0
    `),
  ]);

  const summary = summaryRows.rows[0] as any;
  const claims = claimRows.rows[0] as any;
  const expenses = expenseRows.rows[0] as any;
  const aging = agingRows.rows[0] as any;
  const totalRevenue = num(summary.total_revenue);
  const totalExpenses = num(expenses.expenses);
  const paymentMethods = methodRows.rows.map((row: any) => ({ method: row.method, amount: num(row.amount), count: num(row.count), percentage: pct(num(row.amount), totalRevenue) }));
  const topServices = serviceRows.rows.map((row: any) => ({ name: row.service, revenue: num(row.revenue), patients: num(row.patients), percentage: pct(num(row.revenue), totalRevenue), avgRevenuePerPatient: num(row.patients) ? num(row.revenue) / num(row.patients) : 0 }));
  const monthlyTrends = trendRows.rows.map((row: any, index: number, all: any[]) => {
    const revenue = num(row.revenue);
    const previous = index ? num(all[index - 1].revenue) : revenue;
    const growth = previous ? Math.round(((revenue - previous) / previous) * 100) : 0;
    return { month: row.month, revenue, transactions: num(row.transactions), growth };
  });

  return {
    range,
    generatedAt: new Date().toISOString(),
    templates,
    totalRevenue,
    netRevenue: totalRevenue - totalExpenses,
    monthlyRevenue: months ? totalRevenue / months : totalRevenue,
    revenueGrowth: monthlyTrends.at(-1)?.growth || 0,
    averageTransaction: num(summary.average_transaction),
    transactions: num(summary.transactions),
    outstandingInvoices: num(summary.outstanding),
    collectionRate: pct(totalRevenue, totalRevenue + num(summary.outstanding)),
    totalExpenses,
    claims: {
      total: num(claims.total_claims),
      approved: num(claims.approved_claims),
      claimed: num(claims.claimed),
      approvedAmount: num(claims.approved),
      approvalRate: pct(num(claims.approved_claims), num(claims.total_claims)),
    },
    monthlyTrends,
    paymentMethods,
    topServices,
    departmentRevenue: topServices.map((service) => ({ department: service.name, revenue: service.revenue, patients: service.patients, avgRevenuePerPatient: service.avgRevenuePerPatient })),
    aging: {
      current: num(aging.current_count),
      days1To30: num(aging.days_1_30),
      over30: num(aging.over_30),
      overdueAmount: num(aging.overdue_amount),
    },
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
    const range = new URL(request.url).searchParams.get("timeRange") || "12m";
    return NextResponse.json(await buildRevenuePayload(tenantId, range), { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Error fetching revenue reports:", error);
    return NextResponse.json({ error: "Failed to fetch revenue reports" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "");
    const templates = await getTemplates(tenantId);

    if (action === "save_template") {
      const name = String(body.name || "").trim();
      if (!name) return NextResponse.json({ error: "Template name is required" }, { status: 400 });
      const keyBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "custom-report";
      const key = `custom-${keyBase}-${Date.now().toString(36)}`;
      const [created] = await db.insert(accountantReportTemplates).values({
        tenantId,
        key,
        name,
        type: "revenue",
        category: String(body.category || "Custom").trim() || "Custom",
        description: String(body.description || "Custom revenue report template.").trim(),
        frequency: String(body.frequency || "monthly"),
        estimatedTime: "Live data",
        config: {
          defaultFormat: String(body.defaultFormat || "pdf"),
          sections: Array.isArray(body.sections) ? body.sections : ["summary", "trends", "payments"],
          metrics: Array.isArray(body.metrics) ? body.metrics : ["revenue", "collections", "claims"],
          createdBy: admin.user?.id || null,
        },
        isSystem: false,
      }).returning({
        key: accountantReportTemplates.key,
        name: accountantReportTemplates.name,
        category: accountantReportTemplates.category,
        description: accountantReportTemplates.description,
        config: accountantReportTemplates.config,
      });
      return NextResponse.json({
        success: true,
        template: { key: created.key, name: created.name, category: created.category, description: created.description || "", defaultFormat: ((created.config as any)?.defaultFormat as string) || "pdf", isCustom: true },
      });
    }

    const templateKey = String(body.templateKey || templates[0]?.key || REPORT_TEMPLATES[0].key);
    const template = templates.find((item) => item.key === templateKey) || templates[0] || REPORT_TEMPLATES[0];
    const range = String(body.range || "12m");
    const format = String(body.format || template.defaultFormat || "pdf");

    if (action === "schedule") {
      const frequency = String(body.frequency || "monthly");
      const nextRun = new Date(body.nextRun || Date.now() + 24 * 60 * 60 * 1000);
      const [scheduled] = await db.insert(scheduledAccountantReports).values({
        tenantId,
        templateId: null,
        name: `${template.name} schedule`,
        frequency,
        nextRun,
        recipients: Array.isArray(body.recipients) ? body.recipients : [],
        format,
        isActive: true,
        createdBy: admin.user?.id || null,
        metadata: { templateKey, range, note: "Generated reports should query live data at run time." },
      }).returning({ id: scheduledAccountantReports.id });
      return NextResponse.json({ success: true, scheduledId: scheduled.id });
    }

    const liveData = await buildRevenuePayload(tenantId, range);
    const [report] = await db.insert(accountantReports).values({
      tenantId,
      templateId: null,
      name: `${template.name} - ${new Date().toLocaleDateString()}`,
      type: template.key,
      description: template.description,
      status: "ready",
      format,
      size: "Generated in browser",
      requestedBy: admin.user?.id || null,
      metadata: { templateKey, range, generatedFromLiveData: true, summary: liveData },
    }).returning({ id: accountantReports.id });

    return NextResponse.json({ success: true, reportId: report.id, report: { template, data: liveData, format } });
  } catch (error) {
    console.error("Error generating revenue report:", error);
    return NextResponse.json({ error: "Failed to generate revenue report" }, { status: 500 });
  }
}
