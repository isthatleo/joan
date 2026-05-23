import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accountsPayable } from "@/lib/db/schema";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { parseJsonBody, payableUpdateSchema, validateFinancePayload } from "@/lib/accountant/finance-api";

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

    const record = await db.query.accountsPayable.findFirst({
      where: and(
        eq(accountsPayable.id, id),
        eq(accountsPayable.tenantId, tenantId),
        isNull(accountsPayable.deletedAt)
      ),
    });

    if (!record) return NextResponse.json({ error: "Accounts payable record not found" }, { status: 404 });
    return NextResponse.json(record);
  } catch (error) {
    console.error("Failed to fetch accounts payable record:", error);
    return NextResponse.json({ error: "Failed to fetch accounts payable record" }, { status: 500 });
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

    const parsed = validateFinancePayload(payableUpdateSchema, jsonResult.data);
    if (!parsed.ok) {
      return parsed.response;
    }

    const [updated] = await db
      .update(accountsPayable)
      .set({
        ...parsed.data,
        vendorEmail: parsed.data.vendorEmail ?? null,
        invoiceNumber: parsed.data.invoiceNumber ?? null,
        dueDate: parsed.data.dueDate ?? null,
        notes: parsed.data.notes ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(accountsPayable.id, id),
          eq(accountsPayable.tenantId, tenantId),
          isNull(accountsPayable.deletedAt)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Accounts payable record not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update accounts payable record:", error);
    return NextResponse.json({ error: "Failed to update accounts payable record" }, { status: 500 });
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
      .update(accountsPayable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(accountsPayable.id, id),
          eq(accountsPayable.tenantId, tenantId),
          isNull(accountsPayable.deletedAt)
        )
      )
      .returning({ id: accountsPayable.id });

    if (!deleted) {
      return NextResponse.json({ error: "Accounts payable record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete accounts payable record:", error);
    return NextResponse.json({ error: "Failed to delete accounts payable record" }, { status: 500 });
  }
}
