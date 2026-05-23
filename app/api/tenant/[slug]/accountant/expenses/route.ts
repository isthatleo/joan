import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { expenseCreateSchema, parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await params;
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  const conditions = [eq(expenses.tenantId, tenantId), isNull(expenses.deletedAt)];
  if (status) conditions.push(eq(expenses.status, status));
  if (category) conditions.push(eq(expenses.category, category));

  const rows = await db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.expenseDate))
    .limit(500);

  const [totals] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(expenses)
    .where(and(eq(expenses.tenantId, tenantId), isNull(expenses.deletedAt)));

  return NextResponse.json({ items: rows, total: Number(totals?.total || 0), count: Number(totals?.count || 0) });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const jsonResult = await parseJsonBody(request);
    if (!jsonResult.ok) {
      return jsonResult.response;
    }

    const parsed = validateFinancePayload(expenseCreateSchema, jsonResult.data);
    if (!parsed.ok) {
      return parsed.response;
    }

    const [created] = await db
      .insert(expenses)
      .values({
        tenantId,
        category: parsed.data.category,
        vendor: parsed.data.vendor ?? null,
        description: parsed.data.description ?? null,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        expenseDate: parsed.data.expenseDate,
        paymentMethod: parsed.data.paymentMethod ?? null,
        reference: parsed.data.reference ?? null,
        status: parsed.data.status,
        receiptUrl: parsed.data.receiptUrl ?? null,
        metadata: parsed.data.metadata,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create expense:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
