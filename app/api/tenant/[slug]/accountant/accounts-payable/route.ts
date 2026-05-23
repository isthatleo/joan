import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accountsPayable } from "@/lib/db/schema";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { parseJsonBody, payableCreateSchema, validateFinancePayload } from "@/lib/accountant/finance-api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await params;
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const rows = await db
    .select()
    .from(accountsPayable)
    .where(and(eq(accountsPayable.tenantId, tenantId), isNull(accountsPayable.deletedAt)))
    .orderBy(desc(accountsPayable.dueDate))
    .limit(500);

  const [totals] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${accountsPayable.amount}::numeric - ${accountsPayable.amountPaid}::numeric), 0)`,
      open: sql<number>`COUNT(*) FILTER (WHERE ${accountsPayable.status} = 'open')::int`,
      overdue: sql<number>`COUNT(*) FILTER (WHERE ${accountsPayable.status} = 'open' AND ${accountsPayable.dueDate} < CURRENT_DATE)::int`,
    })
    .from(accountsPayable)
    .where(and(eq(accountsPayable.tenantId, tenantId), isNull(accountsPayable.deletedAt)));

  return NextResponse.json({
    items: rows,
    outstanding: Number(totals?.total || 0),
    openCount: Number(totals?.open || 0),
    overdueCount: Number(totals?.overdue || 0),
  });
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

    const jsonResult = await parseJsonBody(request);
    if (!jsonResult.ok) {
      return jsonResult.response;
    }

    const parsed = validateFinancePayload(payableCreateSchema, jsonResult.data);
    if (!parsed.ok) {
      return parsed.response;
    }

    const [created] = await db
      .insert(accountsPayable)
      .values({
        tenantId,
        vendor: parsed.data.vendor,
        vendorEmail: parsed.data.vendorEmail ?? null,
        invoiceNumber: parsed.data.invoiceNumber ?? null,
        amount: parsed.data.amount,
        amountPaid: parsed.data.amountPaid,
        currency: parsed.data.currency,
        issueDate: parsed.data.issueDate,
        dueDate: parsed.data.dueDate ?? null,
        status: parsed.data.status,
        notes: parsed.data.notes ?? null,
        metadata: parsed.data.metadata,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create accounts payable record:", error);
    return NextResponse.json({ error: "Failed to create accounts payable record" }, { status: 500 });
  }
}
