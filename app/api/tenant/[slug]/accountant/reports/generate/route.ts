import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { accountantReportTemplates, accountantReports, users } from "@/lib/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";
import { reportGenerateSchema } from "@/lib/accountant/route-schemas";
import { ensureDefaultReportTemplates } from "@/lib/accountant/report-service";
import { buildReportSnapshot } from "@/lib/accountant/report-builder";

function resolveTemplateDataset(template: typeof accountantReportTemplates.$inferSelect | null) {
  const config = template?.config;
  if (config && typeof config === "object" && typeof (config as Record<string, unknown>).dataset === "string") {
    return (config as Record<string, unknown>).dataset as string;
  }
  return template?.key || "financial-summary";
}

async function resolveRequestedByUserId(tenantId: string, email?: string | null) {
  if (!email) return null;
  const currentUser = await db.query.users.findFirst({
    where: and(eq(users.tenantId, tenantId), ilike(users.email, email)),
    columns: { id: true },
  });
  return currentUser?.id ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const requestedByUserId = await resolveRequestedByUserId(tenantId, session.user.email);

    const jsonResult = await parseJsonBody(request);
    if (!jsonResult.ok) return jsonResult.response;
    const parsed = validateFinancePayload(reportGenerateSchema, jsonResult.data);
    if (!parsed.ok) return parsed.response;

    await ensureDefaultReportTemplates(tenantId);

    let template = null;
    if (parsed.data.templateId) {
      const [row] = await db
        .select()
        .from(accountantReportTemplates)
        .where(
          and(
            eq(accountantReportTemplates.id, parsed.data.templateId),
            eq(accountantReportTemplates.tenantId, tenantId),
            isNull(accountantReportTemplates.deletedAt)
          )
        )
        .limit(1);
      template = row || null;
    }

    const name = parsed.data.name || template?.name || "Custom Report";
    const type = parsed.data.type || template?.type || "custom";
    const description = parsed.data.description || template?.description || "Custom report request";
    const templateKey = resolveTemplateDataset(template);
    const snapshot = await buildReportSnapshot({
      tenantId,
      templateKey,
      range: typeof parsed.data.metadata?.range === "string" ? parsed.data.metadata.range : undefined,
    });
    const metadata = {
      ...(parsed.data.metadata || {}),
      snapshot,
      templateKey,
      templateConfig: template?.config || {},
    };

    const [created] = await db
      .insert(accountantReports)
      .values({
        tenantId,
        templateId: template?.id ?? null,
        name,
        type,
        description,
        status: "ready",
        format: parsed.data.format,
        size: `${Math.max(48, Math.ceil(JSON.stringify(metadata).length / 1024))} KB`,
        generatedAt: new Date(),
        requestedBy: requestedByUserId,
        metadata,
      })
      .returning({
        id: accountantReports.id,
        name: accountantReports.name,
        type: accountantReports.type,
        description: accountantReports.description,
        createdAt: accountantReports.createdAt,
        generatedAt: accountantReports.generatedAt,
        status: accountantReports.status,
        format: accountantReports.format,
        size: accountantReports.size,
        downloadUrl: accountantReports.downloadUrl,
      });

    const downloadUrl = `/api/tenant/${slug}/accountant/reports/${created.id}/download?format=${created.format}`;

    await db
      .update(accountantReports)
      .set({ downloadUrl })
      .where(eq(accountantReports.id, created.id));

    return NextResponse.json({
      id: created.id,
      success: true,
      report: {
        id: created.id,
        name: created.name,
        type: created.type,
        description: created.description || "",
        createdAt: created.createdAt,
        lastGenerated: created.generatedAt,
        status: created.status,
        format: created.format,
        size: created.size || "N/A",
        downloadUrl,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to generate report:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate report" },
      { status: 500 }
    );
  }
}
