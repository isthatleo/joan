import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { resolveLabContext } from "@/lib/lab/server";

export const dynamic = "force-dynamic";

function parseStock(value: string | null | undefined) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function mapItem(item: any) {
  const quantity = parseStock(item.stock);
  const reorderLevel = Math.max(5, Math.floor(quantity * 0.25) || 5);
  const daysToExpiry = item.expiryDate ? Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / 86400000) : null;
  return {
    id: item.id,
    name: item.name || "Unnamed item",
    category: "Lab Supply",
    quantity,
    reorderLevel,
    location: "Main Lab Store",
    expiryDate: item.expiryDate,
    supplier: null,
    cost: null,
    lastRestocked: item.updatedAt,
    status: quantity <= reorderLevel ? "low" : "ok",
    expiryStatus: daysToExpiry !== null && daysToExpiry <= 30 ? "expiring" : "ok",
    daysToExpiry,
    notes: null,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveLabContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { id } = await params;
  const item = await db.query.inventoryItems.findFirst({
    where: and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, context.technician.tenantId), isNull(inventoryItems.deletedAt)),
  });

  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json(mapItem(item));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const context = await resolveLabContext(request.headers, body.slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { id } = await params;
  const [updated] = await db
    .update(inventoryItems)
    .set({
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      stock: body.quantity !== undefined ? String(body.quantity) : body.stock !== undefined ? String(body.stock) : undefined,
      expiryDate: body.expiryDate !== undefined ? (body.expiryDate ? new Date(body.expiryDate) : null) : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, context.technician.tenantId), isNull(inventoryItems.deletedAt)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json(mapItem(updated));
}
