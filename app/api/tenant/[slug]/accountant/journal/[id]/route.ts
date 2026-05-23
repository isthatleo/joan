import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { journalEntries } from "@/lib/db/schema";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { journalUpdateSchema, parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";

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

    const record = await db.query.journalEntries.findFirst({
      where: and(
        eq(journalEntries.id, id),
        eq(journalEntries.tenantId, tenantId),
        isNull(journalEntries.deletedAt)
      ),
    });

    if (!record) return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    return NextResponse.json(record);
  } catch (error) {
    console.error("Failed to fetch journal entry:", error);
    return NextResponse.json({ error: "Failed to fetch journal entry" }, { status: 500 });
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

    const parsed = validateFinancePayload(journalUpdateSchema, jsonResult.data);
    if (!parsed.ok) {
      return parsed.response;
    }

    const [updated] = await db
      .update(journalEntries)
      .set({
        ...parsed.data,
        reference: parsed.data.reference ?? null,
        description: parsed.data.description ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(journalEntries.id, id),
          eq(journalEntries.tenantId, tenantId),
          isNull(journalEntries.deletedAt)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update journal entry:", error);
    return NextResponse.json({ error: "Failed to update journal entry" }, { status: 500 });
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
      .update(journalEntries)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(journalEntries.id, id),
          eq(journalEntries.tenantId, tenantId),
          isNull(journalEntries.deletedAt)
        )
      )
      .returning({ id: journalEntries.id });

    if (!deleted) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete journal entry:", error);
    return NextResponse.json({ error: "Failed to delete journal entry" }, { status: 500 });
  }
}
