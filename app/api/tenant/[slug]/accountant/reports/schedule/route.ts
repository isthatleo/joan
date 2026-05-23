import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { accountantReportTemplates, scheduledAccountantReports, users } from "@/lib/db/schema";
import { parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";
import { reportScheduleSchema } from "@/lib/accountant/route-schemas";
import { ensureDefaultReportTemplates } from "@/lib/accountant/report-service";
import { ilike } from "drizzle-orm";

async function resolveCreatedByUserId(tenantId: string, email?: string | null) {
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
    const createdBy = await resolveCreatedByUserId(tenantId, session.user.email);

    const jsonResult = await parseJsonBody(request);
    if (!jsonResult.ok) return jsonResult.response;
    const parsed = validateFinancePayload(reportScheduleSchema, jsonResult.data);
    if (!parsed.ok) return parsed.response;

    await ensureDefaultReportTemplates(tenantId);
    const [template] = await db
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

    if (!template) {
      return NextResponse.json({ error: "Report template not found" }, { status: 404 });
    }

    const [created] = await db
      .insert(scheduledAccountantReports)
      .values({
        tenantId,
        templateId: template.id,
        name: parsed.data.name || template.name,
        frequency: parsed.data.frequency,
        nextRun: parsed.data.nextRun ? new Date(parsed.data.nextRun) : nextRunForFrequency(parsed.data.frequency),
        recipients: parsed.data.recipients,
        format: parsed.data.format,
        isActive: true,
        createdBy,
        metadata: {},
      })
      .returning({ id: scheduledAccountantReports.id });

    return NextResponse.json({ id: created.id, success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to schedule report:", error);
    return NextResponse.json({ error: "Failed to schedule report" }, { status: 500 });
  }
}

function nextRunForFrequency(frequency: string) {
  const next = new Date();
  if (frequency === "daily") next.setDate(next.getDate() + 1);
  else if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else if (frequency === "quarterly") next.setMonth(next.getMonth() + 3);
  else next.setMonth(next.getMonth() + 1);
  return next;
}
