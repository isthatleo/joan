import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { scheduledAccountantReports } from "@/lib/db/schema";
import { parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";
import { reportScheduleUpdateSchema } from "@/lib/accountant/route-schemas";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug, id } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const jsonResult = await parseJsonBody(request);
    if (!jsonResult.ok) return jsonResult.response;
    const parsed = validateFinancePayload(reportScheduleUpdateSchema, jsonResult.data);
    if (!parsed.ok) return parsed.response;

    const [updated] = await db
      .update(scheduledAccountantReports)
      .set({
        name: parsed.data.name,
        frequency: parsed.data.frequency,
        nextRun: parsed.data.nextRun ? new Date(parsed.data.nextRun) : undefined,
        recipients: parsed.data.recipients,
        format: parsed.data.format,
        isActive: parsed.data.isActive,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(scheduledAccountantReports.id, id),
          eq(scheduledAccountantReports.tenantId, tenantId),
          isNull(scheduledAccountantReports.deletedAt)
        )
      )
      .returning({ id: scheduledAccountantReports.id });

    if (!updated) {
      return NextResponse.json({ error: "Scheduled report not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update scheduled report:", error);
    return NextResponse.json({ error: "Failed to update scheduled report" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug, id } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const [deleted] = await db
      .update(scheduledAccountantReports)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(scheduledAccountantReports.id, id),
          eq(scheduledAccountantReports.tenantId, tenantId),
          isNull(scheduledAccountantReports.deletedAt)
        )
      )
      .returning({ id: scheduledAccountantReports.id });

    if (!deleted) {
      return NextResponse.json({ error: "Scheduled report not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete scheduled report:", error);
    return NextResponse.json({ error: "Failed to delete scheduled report" }, { status: 500 });
  }
}
