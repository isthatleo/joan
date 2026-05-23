import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { fileResponse, getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { accountantReports } from "@/lib/db/schema";
import {
  buildReportSnapshot,
  getReportBranding,
  renderReportCsv,
  renderReportHtml,
  renderReportPdf,
} from "@/lib/accountant/report-builder";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, id } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const [report] = await db
      .select()
      .from(accountantReports)
      .where(and(eq(accountantReports.id, id), eq(accountantReports.tenantId, tenantId), isNull(accountantReports.deletedAt)))
      .limit(1);

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const metadata = (report.metadata || {}) as Record<string, any>;
    const format = new URL(request.url).searchParams.get("format") || report.format || "pdf";
    const snapshot =
      metadata.snapshot ||
      (await buildReportSnapshot({
        tenantId,
        templateKey: metadata.templateKey || "financial-summary",
        range: typeof metadata.range === "string" ? metadata.range : undefined,
      }));
    const branding = await getReportBranding(tenantId);

    if (format === "csv") {
      return fileResponse(renderReportCsv(snapshot), `report-${report.id}.csv`, "text/csv");
    }

    if (format === "html") {
      return fileResponse(
        renderReportHtml({
          branding,
          reportName: report.name,
          reportType: report.type,
          description: report.description,
          snapshot,
          templateConfig: metadata.templateConfig || {},
        }),
        `report-${report.id}.html`,
        "text/html; charset=utf-8"
      );
    }

    const pdf = renderReportPdf({
      branding,
      reportName: report.name,
      reportType: report.type,
      description: report.description,
      snapshot,
      templateConfig: metadata.templateConfig || {},
    });
    return fileResponse(Buffer.from(pdf), `report-${report.id}.pdf`, "application/pdf");
  } catch (error) {
    console.error("Failed to download report:", error);
    return NextResponse.json({ error: "Failed to download report" }, { status: 500 });
  }
}
