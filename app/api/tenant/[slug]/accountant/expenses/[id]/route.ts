import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { and, eq, isNull } from "drizzle-orm";
import { expenseUpdateSchema, parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";

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
    if (!jsonResult.ok) {
      return jsonResult.response;
    }

    const parsed = validateFinancePayload(expenseUpdateSchema, jsonResult.data);
    if (!parsed.ok) {
      return parsed.response;
    }

    const updates = {
      ...parsed.data,
      vendor: parsed.data.vendor ?? null,
      description: parsed.data.description ?? null,
      paymentMethod: parsed.data.paymentMethod ?? null,
      reference: parsed.data.reference ?? null,
      receiptUrl: parsed.data.receiptUrl ?? null,
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(expenses)
      .set(updates)
      .where(and(eq(expenses.id, id), eq(expenses.tenantId, tenantId), isNull(expenses.deletedAt)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update expense:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
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
      .update(expenses)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(expenses.id, id), eq(expenses.tenantId, tenantId), isNull(expenses.deletedAt)))
      .returning({ id: expenses.id });

    if (!deleted) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
