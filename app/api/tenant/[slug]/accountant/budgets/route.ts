import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { budgets, expenses } from "@/lib/db/schema";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { and, desc, eq, isNull, sql, gte, lte } from "drizzle-orm";
import { budgetCreateSchema, parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";

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
    .from(budgets)
    .where(and(eq(budgets.tenantId, tenantId), isNull(budgets.deletedAt)))
    .orderBy(desc(budgets.startDate))
    .limit(200);

  // Compute live spend per budget by category & date range
  const enriched = await Promise.all(
    rows.map(async (b) => {
      const conditions = [eq(expenses.tenantId, tenantId), isNull(expenses.deletedAt)];
      if (b.category) conditions.push(eq(expenses.category, b.category));
      if (b.startDate) conditions.push(gte(expenses.expenseDate, b.startDate));
      if (b.endDate) conditions.push(lte(expenses.expenseDate, b.endDate));
      const [row] = await db
        .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)` })
        .from(expenses)
        .where(and(...conditions));
      const spent = Number(row?.total || 0);
      const budgetAmount = Number(b.amount || 0);
      return {
        ...b,
        spent,
        remaining: budgetAmount - spent,
        utilization: budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0,
      };
    })
  );

  return NextResponse.json({ items: enriched });
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

    const parsed = validateFinancePayload(budgetCreateSchema, jsonResult.data);
    if (!parsed.ok) {
      return parsed.response;
    }

    const [created] = await db
      .insert(budgets)
      .values({
        tenantId,
        name: parsed.data.name,
        category: parsed.data.category ?? null,
        period: parsed.data.period,
        amount: parsed.data.amount,
        spent: parsed.data.spent,
        currency: parsed.data.currency,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate ?? null,
        status: parsed.data.status,
        metadata: parsed.data.metadata,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create budget:", error);
    return NextResponse.json({ error: "Failed to create budget" }, { status: 500 });
  }
}
