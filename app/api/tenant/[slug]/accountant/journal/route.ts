import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { journalEntries } from "@/lib/db/schema";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { journalCreateSchema, parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";

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
    .from(journalEntries)
    .where(and(eq(journalEntries.tenantId, tenantId), isNull(journalEntries.deletedAt)))
    .orderBy(desc(journalEntries.entryDate))
    .limit(500);

  return NextResponse.json({ items: rows });
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

    const parsed = validateFinancePayload(journalCreateSchema, jsonResult.data);
    if (!parsed.ok) {
      return parsed.response;
    }

    const [created] = await db
      .insert(journalEntries)
      .values({
        tenantId,
        entryDate: parsed.data.entryDate,
        reference: parsed.data.reference ?? null,
        description: parsed.data.description ?? null,
        debitAccount: parsed.data.debitAccount,
        creditAccount: parsed.data.creditAccount,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        postedBy: session.user.id as string,
        status: parsed.data.status,
        metadata: parsed.data.metadata,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create journal entry:", error);
    return NextResponse.json({ error: "Failed to create journal entry" }, { status: 500 });
  }
}
