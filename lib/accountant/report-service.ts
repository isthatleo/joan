import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accountantReportTemplates,
  accountantReports,
  scheduledAccountantReports,
} from "@/lib/db/schema";

const defaultTemplates = [
  {
    key: "financial-summary",
    name: "Financial Summary Report",
    type: "financial",
    category: "Financial",
    description: "Revenue, expenses, profit, receivables, and payables for the selected period.",
    frequency: "monthly",
    estimatedTime: "2-3 minutes",
    config: { dataset: "financial-summary", accent: "#f97316", layout: "executive" },
  },
  {
    key: "revenue-analysis",
    name: "Revenue Analysis",
    type: "financial",
    category: "Financial",
    description: "Monthly revenue performance, growth, and channel contribution.",
    frequency: "weekly",
    estimatedTime: "1-2 minutes",
    config: { dataset: "revenue-analysis", accent: "#2563eb", layout: "trend" },
  },
  {
    key: "cash-flow-statement",
    name: "Cash Flow Statement",
    type: "financial",
    category: "Financial",
    description: "Operating, investing, and financing cash flow movements.",
    frequency: "monthly",
    estimatedTime: "2-4 minutes",
    config: { dataset: "cash-flow", accent: "#0f766e", layout: "statement" },
  },
  {
    key: "budget-vs-actual",
    name: "Budget vs Actual",
    type: "financial",
    category: "Financial",
    description: "Compare budgets against actual spend and utilization by budget line.",
    frequency: "monthly",
    estimatedTime: "2-3 minutes",
    config: { dataset: "budget-vs-actual", accent: "#7c3aed", layout: "variance" },
  },
  {
    key: "expense-summary",
    name: "Expense Summary",
    type: "financial",
    category: "Financial",
    description: "Expense trend and category allocation for the accounting period.",
    frequency: "weekly",
    estimatedTime: "1-2 minutes",
    config: { dataset: "expense-summary", accent: "#dc2626", layout: "table" },
  },
  {
    key: "billing-report",
    name: "Billing & Collections Report",
    type: "billing",
    category: "Billing",
    description: "Invoice status, due balances, collections, and performance metrics.",
    frequency: "weekly",
    estimatedTime: "2-4 minutes",
    config: { dataset: "billing-report", accent: "#0891b2", layout: "operations" },
  },
  {
    key: "invoice-aging",
    name: "Invoice Aging Report",
    type: "billing",
    category: "Billing",
    description: "Aging buckets for unpaid invoices and overdue exposure.",
    frequency: "weekly",
    estimatedTime: "1-2 minutes",
    config: { dataset: "invoice-aging", accent: "#0f766e", layout: "aging" },
  },
  {
    key: "collections-performance",
    name: "Collections Performance",
    type: "billing",
    category: "Billing",
    description: "Collection rate, payment turnaround, and outstanding balance movement.",
    frequency: "monthly",
    estimatedTime: "2-3 minutes",
    config: { dataset: "collections-performance", accent: "#f59e0b", layout: "scorecard" },
  },
  {
    key: "insurance-claims",
    name: "Insurance Claims Summary",
    type: "billing",
    category: "Billing",
    description: "Claims status, approval rates, values, and denial insights.",
    frequency: "monthly",
    estimatedTime: "3-5 minutes",
    config: { dataset: "insurance-claims", accent: "#0284c7", layout: "claims" },
  },
  {
    key: "payment-methods",
    name: "Payment Methods Analysis",
    type: "financial",
    category: "Financial",
    description: "Transaction distribution and throughput by payment method.",
    frequency: "quarterly",
    estimatedTime: "1-2 minutes",
    config: { dataset: "payment-methods", accent: "#16a34a", layout: "distribution" },
  },
  {
    key: "patient-financial",
    name: "Patient Financial Overview",
    type: "patient",
    category: "Patient",
    description: "Patient balances, payment history indicators, and receivable exposure.",
    frequency: "monthly",
    estimatedTime: "2-3 minutes",
    config: { dataset: "patient-financial", accent: "#9333ea", layout: "patient" },
  },
  {
    key: "accounts-payable-aging",
    name: "Accounts Payable Aging",
    type: "financial",
    category: "Financial",
    description: "Outstanding vendor obligations grouped by due age.",
    frequency: "weekly",
    estimatedTime: "1-2 minutes",
    config: { dataset: "accounts-payable-aging", accent: "#b45309", layout: "aging" },
  },
  {
    key: "tax-summary",
    name: "Tax Summary",
    type: "financial",
    category: "Compliance",
    description: "Tax liabilities, remittances, and filing readiness snapshot.",
    frequency: "monthly",
    estimatedTime: "2-3 minutes",
    config: { dataset: "tax-summary", accent: "#334155", layout: "compliance" },
  },
  {
    key: "journal-audit",
    name: "Journal Audit Trail",
    type: "operational",
    category: "Operations",
    description: "Recent journal postings, references, and posting activity.",
    frequency: "weekly",
    estimatedTime: "1-2 minutes",
    config: { dataset: "journal-audit", accent: "#475569", layout: "audit" },
  },
  {
    key: "monthly-close-pack",
    name: "Monthly Close Pack",
    type: "financial",
    category: "Executive",
    description: "High-level month-end revenue, expense, cash, receivable, and payable summary for finance leadership.",
    frequency: "monthly",
    estimatedTime: "3-5 minutes",
    config: { dataset: "financial-summary", accent: "#1d4ed8", layout: "executive-pack" },
  },
  {
    key: "denial-recovery",
    name: "Claims Denial & Recovery",
    type: "billing",
    category: "Billing",
    description: "Denied claim counts, denied value, approval recovery, and claims follow-up performance.",
    frequency: "weekly",
    estimatedTime: "2-4 minutes",
    config: { dataset: "insurance-claims", accent: "#be123c", layout: "recovery" },
  },
  {
    key: "ar-watchlist",
    name: "Accounts Receivable Watchlist",
    type: "billing",
    category: "Collections",
    description: "Receivable exposure and unpaid invoice concentration for follow-up prioritization.",
    frequency: "weekly",
    estimatedTime: "2-3 minutes",
    config: { dataset: "invoice-aging", accent: "#b45309", layout: "watchlist" },
  },
  {
    key: "vendor-spend-analysis",
    name: "Vendor Spend Analysis",
    type: "financial",
    category: "Procurement",
    description: "Expense distribution by vendor and category to support procurement and cost-control reviews.",
    frequency: "monthly",
    estimatedTime: "2-3 minutes",
    config: { dataset: "expense-summary", accent: "#0f766e", layout: "vendor-spend" },
  },
  {
    key: "cash-position-brief",
    name: "Cash Position Brief",
    type: "financial",
    category: "Treasury",
    description: "Compact treasury snapshot of operating cash flow, outgoing spend, and collection strength.",
    frequency: "weekly",
    estimatedTime: "1-2 minutes",
    config: { dataset: "cash-flow", accent: "#0369a1", layout: "treasury" },
  },
];

export async function ensureDefaultReportTemplates(tenantId: string) {
  const existing = await db
    .select()
    .from(accountantReportTemplates)
    .where(and(eq(accountantReportTemplates.tenantId, tenantId), isNull(accountantReportTemplates.deletedAt)));

  const existingKeys = new Set(existing.map((template) => template.key));
  const missing = defaultTemplates.filter((template) => !existingKeys.has(template.key));

  if (missing.length > 0) {
    await db.insert(accountantReportTemplates).values(
      missing.map((template) => ({
        tenantId,
        key: template.key,
        name: template.name,
        type: template.type,
        category: template.category,
        description: template.description,
        frequency: template.frequency,
        estimatedTime: template.estimatedTime,
        config: template.config,
        isSystem: true,
      }))
    );
  }

  return db
    .select()
    .from(accountantReportTemplates)
    .where(and(eq(accountantReportTemplates.tenantId, tenantId), isNull(accountantReportTemplates.deletedAt)));
}

export async function listReportTemplates(tenantId: string) {
  await ensureDefaultReportTemplates(tenantId);
  return db
    .select()
    .from(accountantReportTemplates)
    .where(and(eq(accountantReportTemplates.tenantId, tenantId), isNull(accountantReportTemplates.deletedAt)))
    .orderBy(accountantReportTemplates.category, accountantReportTemplates.name);
}

export async function createReportTemplate(
  tenantId: string,
  values: {
    key: string;
    name: string;
    type: string;
    category: string;
    description?: string;
    frequency: string;
    estimatedTime?: string;
    config?: Record<string, unknown>;
    isSystem?: boolean;
  }
) {
  const [created] = await db
    .insert(accountantReportTemplates)
    .values({
      tenantId,
      key: values.key,
      name: values.name,
      type: values.type,
      category: values.category,
      description: values.description || null,
      frequency: values.frequency,
      estimatedTime: values.estimatedTime || "1-2 minutes",
      config: values.config || {},
      isSystem: values.isSystem ?? false,
    })
    .returning();

  return created;
}

export async function listGeneratedReports(tenantId: string) {
  return db
    .select()
    .from(accountantReports)
    .where(and(eq(accountantReports.tenantId, tenantId), isNull(accountantReports.deletedAt)))
    .orderBy(desc(accountantReports.generatedAt));
}

export async function listScheduledReports(tenantId: string) {
  return db
    .select()
    .from(scheduledAccountantReports)
    .where(and(eq(scheduledAccountantReports.tenantId, tenantId), isNull(scheduledAccountantReports.deletedAt)))
    .orderBy(desc(scheduledAccountantReports.nextRun));
}
