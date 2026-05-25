import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
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
  const daysToExpiry = item.expiryDate
    ? Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / 86400000)
    : null;

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

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveLabContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const rows = await db.query.inventoryItems.findMany({
    where: and(eq(inventoryItems.tenantId, context.technician.tenantId), isNull(inventoryItems.deletedAt)),
    orderBy: asc(inventoryItems.name),
  });

  const items = rows.map(mapItem);
  return NextResponse.json({
    items,
    stats: {
      total: items.length,
      lowStock: items.filter((item) => item.status === "low").length,
      expiringSoon: items.filter((item) => item.expiryStatus === "expiring").length,
      inStock: items.filter((item) => item.status === "ok").length,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const context = await resolveLabContext(request.headers, body.slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  if (!body.name) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }

  const [created] = await db
    .insert(inventoryItems)
    .values({
      tenantId: context.technician.tenantId,
      name: String(body.name).trim(),
      stock: String(body.quantity ?? body.stock ?? 0),
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
    })
    .returning();

  return NextResponse.json(mapItem(created), { status: 201 });
}
