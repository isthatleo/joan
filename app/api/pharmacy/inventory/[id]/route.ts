import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { listInventory, saveInventoryMetadata } from "@/lib/pharmacy/data";
import { resolvePharmacyContext } from "@/lib/pharmacy/server";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const context = await resolvePharmacyContext(request.headers, body.slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const updatePayload: Record<string, any> = { updatedAt: new Date() };
  if (body.name) updatePayload.name = String(body.name).trim();
  if (body.stock !== undefined) updatePayload.stock = String(body.stock);
  if (body.expiryDate !== undefined) updatePayload.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;

  await db.update(inventoryItems).set(updatePayload).where(and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, context.pharmacist.tenantId), isNull(inventoryItems.deletedAt)));

  const inventory = await listInventory(context.pharmacist.tenantId);
  const metadata = Object.fromEntries(inventory.items.map((item) => [item.id, {
    genericName: item.genericName,
    category: item.category,
    dosage: item.dosage,
    minStock: item.minStock,
    maxStock: item.maxStock,
    supplierId: item.supplierId,
    supplierName: item.supplier,
    unitPrice: item.unitPrice,
    batchNumber: item.batchNumber,
    reorderLevel: item.reorderLevel,
    location: item.location,
    notes: item.notes,
  }]));
  metadata[id] = {
    ...(metadata[id] || {}),
    genericName: body.genericName ?? metadata[id]?.genericName,
    category: body.category ?? metadata[id]?.category,
    dosage: body.dosage ?? metadata[id]?.dosage,
    minStock: body.minStock !== undefined ? Number(body.minStock) : metadata[id]?.minStock,
    maxStock: body.maxStock !== undefined ? Number(body.maxStock) : metadata[id]?.maxStock,
    supplierId: body.supplierId !== undefined ? body.supplierId : metadata[id]?.supplierId,
    supplierName: body.supplier !== undefined ? body.supplier : metadata[id]?.supplierName,
    unitPrice: body.unitPrice !== undefined ? Number(body.unitPrice) : metadata[id]?.unitPrice,
    batchNumber: body.batchNumber !== undefined ? body.batchNumber : metadata[id]?.batchNumber,
    reorderLevel: body.reorderLevel !== undefined ? Number(body.reorderLevel) : metadata[id]?.reorderLevel,
    location: body.location !== undefined ? body.location : metadata[id]?.location,
    notes: body.notes !== undefined ? body.notes : metadata[id]?.notes,
  };
  await saveInventoryMetadata(context.pharmacist.tenantId, metadata, context.pharmacist.id);

  const refreshed = await listInventory(context.pharmacist.tenantId);
  return NextResponse.json(refreshed.items.find((item) => item.id === id) || null);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await resolvePharmacyContext(request.headers, request.nextUrl.searchParams.get("slug"));
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  await db.update(inventoryItems).set({ deletedAt: new Date(), updatedAt: new Date() }).where(and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, context.pharmacist.tenantId), isNull(inventoryItems.deletedAt)));
  return NextResponse.json({ success: true });
}
