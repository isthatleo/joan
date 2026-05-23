import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { budgets } from "@/lib/db/schema";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { budgetUpdateSchema, parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug, id } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const record = await db.query.budgets.findFirst({
      where: and(eq(budgets.id, id), eq(budgets.tenantId, tenantId), isNull(budgets.deletedAt)),
    });

    if (!record) return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    return NextResponse.json(record);
  } catch (error) {
    console.error("Failed to fetch budget:", error);
    return NextResponse.json({ error: "Failed to fetch budget" }, { status: 500 });
  }
}

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

    const parsed = validateFinancePayload(budgetUpdateSchema, jsonResult.data);
    if (!parsed.ok) {
      return parsed.response;
    }

    const [updated] = await db
      .update(budgets)
      .set({
        ...parsed.data,
        category: parsed.data.category ?? null,
        endDate: parsed.data.endDate ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(budgets.id, id), eq(budgets.tenantId, tenantId), isNull(budgets.deletedAt)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update budget:", error);
    return NextResponse.json({ error: "Failed to update budget" }, { status: 500 });
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
      .update(budgets)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(budgets.id, id), eq(budgets.tenantId, tenantId), isNull(budgets.deletedAt)))
      .returning({ id: budgets.id });

    if (!deleted) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete budget:", error);
    return NextResponse.json({ error: "Failed to delete budget" }, { status: 500 });
  }
}
