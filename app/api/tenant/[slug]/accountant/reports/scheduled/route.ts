import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { listScheduledReports } from "@/lib/accountant/report-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const rows = await listScheduledReports(tenantId);
    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        templateId: row.templateId,
        name: row.name,
        frequency: row.frequency,
        nextRun: row.nextRun,
        recipients: Array.isArray(row.recipients) ? row.recipients : [],
        format: row.format,
        isActive: row.isActive,
      }))
    );
  } catch (error) {
    console.error("Failed to fetch scheduled reports:", error);
    return NextResponse.json({ error: "Failed to fetch scheduled reports" }, { status: 500 });
  }
}
