import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { accountantReports } from "@/lib/db/schema";

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

    return NextResponse.json({
      id: report.id,
      name: report.name,
      type: report.type,
      description: report.description || "",
      status: report.status,
      format: report.format,
      size: report.size || "N/A",
      createdAt: report.createdAt,
      generatedAt: report.generatedAt,
      downloadUrl: report.downloadUrl || undefined,
      templateId: report.templateId,
      requestedBy: report.requestedBy,
      snapshot: metadata.snapshot || null,
      templateKey: metadata.templateKey || null,
      templateConfig: metadata.templateConfig || {},
      metadata,
    });
  } catch (error) {
    console.error("Failed to fetch report details:", error);
    return NextResponse.json({ error: "Failed to fetch report details" }, { status: 500 });
  }
}

export async function DELETE(
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

    const [deleted] = await db
      .update(accountantReports)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(accountantReports.id, id), eq(accountantReports.tenantId, tenantId), isNull(accountantReports.deletedAt)))
      .returning({ id: accountantReports.id });

    if (!deleted) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete report:", error);
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}
