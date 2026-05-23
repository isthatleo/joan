import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taxRecords } from "@/lib/db/schema";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { parseJsonBody, taxUpdateSchema, validateFinancePayload } from "@/lib/accountant/finance-api";

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

    const record = await db.query.taxRecords.findFirst({
      where: and(eq(taxRecords.id, id), eq(taxRecords.tenantId, tenantId), isNull(taxRecords.deletedAt)),
    });

    if (!record) return NextResponse.json({ error: "Tax record not found" }, { status: 404 });
    return NextResponse.json(record);
  } catch (error) {
    console.error("Failed to fetch tax record:", error);
    return NextResponse.json({ error: "Failed to fetch tax record" }, { status: 500 });
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

    const parsed = validateFinancePayload(taxUpdateSchema, jsonResult.data);
    if (!parsed.ok) {
      return parsed.response;
    }

    const [updated] = await db
      .update(taxRecords)
      .set({
        ...parsed.data,
        jurisdiction: parsed.data.jurisdiction ?? null,
        dueDate: parsed.data.dueDate ?? null,
        reference: parsed.data.reference ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(taxRecords.id, id), eq(taxRecords.tenantId, tenantId), isNull(taxRecords.deletedAt)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Tax record not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update tax record:", error);
    return NextResponse.json({ error: "Failed to update tax record" }, { status: 500 });
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
      .update(taxRecords)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(taxRecords.id, id), eq(taxRecords.tenantId, tenantId), isNull(taxRecords.deletedAt)))
      .returning({ id: taxRecords.id });

    if (!deleted) {
      return NextResponse.json({ error: "Tax record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete tax record:", error);
    return NextResponse.json({ error: "Failed to delete tax record" }, { status: 500 });
  }
}
