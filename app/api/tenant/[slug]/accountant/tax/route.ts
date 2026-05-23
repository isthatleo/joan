import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taxRecords } from "@/lib/db/schema";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { parseJsonBody, taxCreateSchema, validateFinancePayload } from "@/lib/accountant/finance-api";

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
    .from(taxRecords)
    .where(and(eq(taxRecords.tenantId, tenantId), isNull(taxRecords.deletedAt)))
    .orderBy(desc(taxRecords.createdAt))
    .limit(200);

  const [totals] = await db
    .select({
      due: sql<string>`COALESCE(SUM(${taxRecords.taxAmount}::numeric) FILTER (WHERE ${taxRecords.status} <> 'filed'), 0)`,
      filed: sql<string>`COALESCE(SUM(${taxRecords.taxAmount}::numeric) FILTER (WHERE ${taxRecords.status} = 'filed'), 0)`,
    })
    .from(taxRecords)
    .where(and(eq(taxRecords.tenantId, tenantId), isNull(taxRecords.deletedAt)));

  return NextResponse.json({
    items: rows,
    totalDue: Number(totals?.due || 0),
    totalFiled: Number(totals?.filed || 0),
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

    const parsed = validateFinancePayload(taxCreateSchema, jsonResult.data);
    if (!parsed.ok) {
      return parsed.response;
    }

    const [created] = await db
      .insert(taxRecords)
      .values({
        tenantId,
        period: parsed.data.period,
        taxType: parsed.data.taxType,
        jurisdiction: parsed.data.jurisdiction ?? null,
        taxableAmount: parsed.data.taxableAmount,
        taxAmount: parsed.data.taxAmount,
        rate: parsed.data.rate,
        currency: parsed.data.currency,
        dueDate: parsed.data.dueDate ?? null,
        status: parsed.data.status,
        reference: parsed.data.reference ?? null,
        metadata: parsed.data.metadata,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create tax record:", error);
    return NextResponse.json({ error: "Failed to create tax record" }, { status: 500 });
  }
}
