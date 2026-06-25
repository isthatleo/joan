import { and, eq, isNull, lte } from "drizzle-orm";
import { sendEmail } from "@/lib/email/send-email";
import { db } from "@/lib/db";
import { accountantReportTemplates, accountantReports, scheduledAccountantReports, tenants, users } from "@/lib/db/schema";
import {
  buildReportSnapshot,
  getReportBranding,
  renderReportCsv,
  renderReportHtml,
  renderReportPdf,
} from "@/lib/accountant/report-builder";
import { getTenantWorkflowSettings, isWorkflowAutomationAllowed } from "@/lib/tenant-workflows";

type ScheduledRow = typeof scheduledAccountantReports.$inferSelect;
type TemplateRow = typeof accountantReportTemplates.$inferSelect;
type TenantRow = typeof tenants.$inferSelect;

type RunResult =
  | { ok: true; scheduleId: string; reportId: string; nextRun: string; recipients: number; emailLogIds: string[] }
  | { ok: false; scheduleId: string; error: string };

function resolveTemplateDataset(template: TemplateRow | null) {
  const config = template?.config;
  if (config && typeof config === "object" && typeof (config as Record<string, unknown>).dataset === "string") {
    return (config as Record<string, unknown>).dataset as string;
  }
  return template?.key || "financial-summary";
}

function normalizeScheduledFormat(format: string) {
  return format === "excel" ? "csv" : format;
}

function contentTypeForFormat(format: string) {
  switch (format) {
    case "pdf":
      return "application/pdf";
    case "html":
      return "text/html; charset=utf-8";
    default:
      return "text/csv; charset=utf-8";
  }
}

function fileExtensionForFormat(format: string) {
  switch (format) {
    case "pdf":
      return "pdf";
    case "html":
      return "html";
    default:
      return "csv";
  }
}

function encodeAttachment(content: string | Buffer) {
  return Buffer.isBuffer(content) ? content.toString("base64") : Buffer.from(content, "utf8").toString("base64");
}

function nextRunForFrequency(from: Date, frequency: string) {
  const next = new Date(from);
  if (frequency === "daily") next.setDate(next.getDate() + 1);
  else if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else if (frequency === "quarterly") next.setMonth(next.getMonth() + 3);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

function nextRetryAt(from: Date) {
  const next = new Date(from);
  next.setMinutes(next.getMinutes() + 15);
  return next;
}

function computeFutureRun(currentNextRun: Date, frequency: string, now: Date) {
  let next = nextRunForFrequency(currentNextRun, frequency);
  while (next <= now) {
    next = nextRunForFrequency(next, frequency);
  }
  return next;
}

async function resolveCreatedByUserId(tenantId: string, email?: string | null) {
  if (!email) return null;
  const currentUser = await db.query.users.findFirst({
    where: and(eq(users.tenantId, tenantId), eq(users.email, email)),
    columns: { id: true },
  });
  return currentUser?.id ?? null;
}

async function findExistingScheduledReport(tenantId: string, templateId: string, scheduledRunId: string) {
  const reports = await db
    .select()
    .from(accountantReports)
    .where(and(eq(accountantReports.tenantId, tenantId), eq(accountantReports.templateId, templateId), isNull(accountantReports.deletedAt)));

  return (
    reports.find((report) => {
      const metadata = (report.metadata || {}) as Record<string, unknown>;
      return metadata.scheduledRunId === scheduledRunId;
    }) || null
  );
}

async function createOrReuseScheduledGeneratedReport(args: {
  tenant: TenantRow;
  template: TemplateRow;
  schedule: ScheduledRow;
  requestedBy: string | null;
}) {
  const scheduledRunId = `${args.schedule.id}:${args.schedule.nextRun.toISOString()}:${normalizeScheduledFormat(args.schedule.format)}`;
  const existing = await findExistingScheduledReport(args.tenant.id, args.template.id, scheduledRunId);
  if (existing) {
    return existing;
  }

  const templateKey = resolveTemplateDataset(args.template);
  const snapshot = await buildReportSnapshot({
    tenantId: args.tenant.id,
    templateKey,
    range: undefined,
  });

  const metadata = {
    snapshot,
    templateKey,
    templateConfig: args.template.config || {},
    scheduledRunId,
    scheduleId: args.schedule.id,
    scheduledFor: args.schedule.nextRun.toISOString(),
  };

  const [created] = await db
    .insert(accountantReports)
    .values({
      tenantId: args.tenant.id,
      templateId: args.template.id,
      name: args.template.name,
      type: args.template.type,
      description: args.template.description || `Scheduled ${args.template.name} report`,
      status: "ready",
      format: normalizeScheduledFormat(args.schedule.format),
      size: `${Math.max(48, Math.ceil(JSON.stringify(metadata).length / 1024))} KB`,
      generatedAt: new Date(),
      requestedBy: args.requestedBy,
      metadata,
    })
    .returning();

  const downloadUrl = `/api/tenant/${args.tenant.slug}/accountant/reports/${created.id}/download?format=${normalizeScheduledFormat(args.schedule.format)}`;
  await db.update(accountantReports).set({ downloadUrl }).where(eq(accountantReports.id, created.id));

  return {
    ...created,
    downloadUrl,
  };
}

function buildEmailTemplate(reportName: string, reportType: string, reportUrl: string, snapshot: Awaited<ReturnType<typeof buildReportSnapshot>>) {
  return {
    templateName: "scheduled-report",
    heading: reportName,
    preheader: `${reportType} report is ready`,
    body: "A scheduled accountant report has been generated and attached for review.",
    ctaLabel: "Open Report",
    ctaUrl: reportUrl,
    summary: snapshot.summary,
    sections: snapshot.sections.slice(0, 3).map((section) => ({
      title: section.title,
      body: "description" in section && typeof section.description === "string" ? section.description : "",
    })),
    footerNote: "This is an automated scheduled report delivery.",
    variant: "report" as const,
  };
}

async function sendScheduledReportEmails(args: {
  tenant: TenantRow;
  template: TemplateRow;
  schedule: ScheduledRow;
  report: typeof accountantReports.$inferSelect;
}) {
  const metadata = (args.report.metadata || {}) as Record<string, any>;
  const snapshot = metadata.snapshot;
  const templateConfig = (metadata.templateConfig || {}) as Record<string, any>;
  const branding = await getReportBranding(args.tenant.id);
  const format = normalizeScheduledFormat(args.schedule.format);
  const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://joanhealth.tech/"}/tenant/${args.tenant.slug}/accountant/reports/${args.report.id}`;

  const htmlContent = renderReportHtml({
    branding,
    reportName: args.report.name,
    reportType: args.report.type,
    description: args.report.description,
    snapshot,
    templateConfig,
  });
  const csvContent = renderReportCsv(snapshot);
  const pdfContent = Buffer.from(
    renderReportPdf({
      branding,
      reportName: args.report.name,
      reportType: args.report.type,
      description: args.report.description,
      snapshot,
      templateConfig,
    })
  );

  const attachmentContent = format === "pdf" ? pdfContent : format === "html" ? htmlContent : csvContent;
  const emailLogIds: string[] = [];
  const recipients = Array.isArray(args.schedule.recipients) ? (args.schedule.recipients as string[]) : [];

  for (const recipient of recipients) {
    const emailResult = await sendEmail(
      {
        to: recipient,
        subject: `${args.report.name} is ready`,
        tenantSlug: args.tenant.slug,
        templateName: "scheduled-report",
        template: buildEmailTemplate(args.report.name, args.report.type, reportUrl, snapshot) as any,
        attachments: [
          {
            filename: `${args.report.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "scheduled-report"}.${fileExtensionForFormat(format)}`,
            content: encodeAttachment(attachmentContent),
            contentType: contentTypeForFormat(format),
          },
        ],
        tags: [
          { name: "category", value: "scheduled-report" },
          { name: "scheduleId", value: args.schedule.id },
          { name: "reportId", value: args.report.id },
        ],
      },
      {
        idempotencyKey: `scheduled-report/${args.schedule.id}/${args.schedule.nextRun.toISOString()}/${recipient}/${format}`,
      }
    );

    if (!emailResult.ok) {
      const payload = await emailResult.response.json().catch(() => null);
      throw new Error(payload?.error || "Failed to send scheduled report email");
    }

    if (emailResult.data.logId) {
      emailLogIds.push(emailResult.data.logId);
    }
  }

  return emailLogIds;
}

export async function executeScheduledReport(schedule: ScheduledRow): Promise<RunResult> {
  try {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, schedule.tenantId)).limit(1);
    if (!tenant) {
      throw new Error("Tenant not found for scheduled report");
    }

    const workflow = await getTenantWorkflowSettings(tenant.id);
    if (!isWorkflowAutomationAllowed(workflow, "reportGeneration")) {
      const now = new Date();
      const nextRun = computeFutureRun(schedule.nextRun, schedule.frequency, now);
      const currentMeta = ((schedule.metadata || {}) as Record<string, any>) || {};
      await db
        .update(scheduledAccountantReports)
        .set({
          nextRun,
          updatedAt: now,
          metadata: {
            ...currentMeta,
            lastAttemptAt: now.toISOString(),
            lastResult: "suppressed",
            lastError: "Tenant workflow policy disabled report generation",
            runCount: Number(currentMeta.runCount || 0),
          },
        })
        .where(eq(scheduledAccountantReports.id, schedule.id));

      return {
        ok: false,
        scheduleId: schedule.id,
        error: "Tenant workflow policy disabled report generation",
      };
    }

    const templates = await db
      .select()
      .from(accountantReportTemplates)
      .where(eq(accountantReportTemplates.tenantId, tenant.id));
    const template = templates.find((item) => item.id === schedule.templateId && !item.deletedAt) || null;

    if (!template || template.deletedAt) {
      throw new Error("Scheduled report template not found");
    }

    const requestedBy = await resolveCreatedByUserId(tenant.id, null);
    const report = await createOrReuseScheduledGeneratedReport({
      tenant,
      template,
      schedule,
      requestedBy: requestedBy || schedule.createdBy || null,
    });
    const emailLogIds = await sendScheduledReportEmails({
      tenant,
      template,
      schedule,
      report,
    });

    const now = new Date();
    const nextRun = computeFutureRun(schedule.nextRun, schedule.frequency, now);
    const currentMeta = ((schedule.metadata || {}) as Record<string, any>) || {};
    await db
      .update(scheduledAccountantReports)
      .set({
        nextRun,
        updatedAt: now,
        metadata: {
          ...currentMeta,
          lastRunAt: now.toISOString(),
          lastResult: "success",
          lastReportId: report.id,
          lastEmailLogIds: emailLogIds,
          runCount: Number(currentMeta.runCount || 0) + 1,
          lastError: null,
        },
      })
      .where(eq(scheduledAccountantReports.id, schedule.id));

    return {
      ok: true,
      scheduleId: schedule.id,
      reportId: report.id,
      nextRun: nextRun.toISOString(),
      recipients: Array.isArray(schedule.recipients) ? schedule.recipients.length : 0,
      emailLogIds,
    };
  } catch (error) {
    const now = new Date();
    const currentMeta = ((schedule.metadata || {}) as Record<string, any>) || {};
    await db
      .update(scheduledAccountantReports)
      .set({
        nextRun: nextRetryAt(now),
        updatedAt: now,
        metadata: {
          ...currentMeta,
          lastAttemptAt: now.toISOString(),
          lastResult: "failed",
          lastError: error instanceof Error ? error.message : "Failed to execute scheduled report",
          runCount: Number(currentMeta.runCount || 0),
        },
      })
      .where(eq(scheduledAccountantReports.id, schedule.id));

    return {
      ok: false,
      scheduleId: schedule.id,
      error: error instanceof Error ? error.message : "Failed to execute scheduled report",
    };
  }
}

export async function getDueScheduledReports(now = new Date()) {
  return db
    .select()
    .from(scheduledAccountantReports)
    .where(
      and(
        eq(scheduledAccountantReports.isActive, true),
        isNull(scheduledAccountantReports.deletedAt),
        lte(scheduledAccountantReports.nextRun, now)
      )
    );
}
