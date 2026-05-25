import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { listInventory, saveInventoryMetadata } from "@/lib/pharmacy/data";
import { resolvePharmacyContext } from "@/lib/pharmacy/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolvePharmacyContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const inventory = await listInventory(context.pharmacist.tenantId);
  const search = String(request.nextUrl.searchParams.get("search") || "").toLowerCase();
  const status = String(request.nextUrl.searchParams.get("status") || "all");
  const category = String(request.nextUrl.searchParams.get("category") || "all");

  const items = inventory.items.filter((item) => {
    const matchesSearch = !search || item.name.toLowerCase().includes(search) || item.genericName.toLowerCase().includes(search);
    const matchesStatus = status === "all" || item.status === status;
    const matchesCategory = category === "all" || item.category === category;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return NextResponse.json({ items, stats: inventory.stats, suppliers: inventory.suppliers }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const context = await resolvePharmacyContext(request.headers, body.slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!body.name) return NextResponse.json({ error: "Medication name is required" }, { status: 400 });

  const [created] = await db.insert(inventoryItems).values({
    tenantId: context.pharmacist.tenantId,
    name: String(body.name).trim(),
    stock: String(body.stock ?? 0),
    expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
  }).returning();

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
  metadata[created.id] = {
    genericName: body.genericName || body.name,
    category: body.category || "General",
    dosage: body.dosage || "Standard",
    minStock: Number(body.minStock ?? 10),
    maxStock: Number(body.maxStock ?? body.stock ?? 30),
    supplierId: body.supplierId || null,
    supplierName: body.supplier || null,
    unitPrice: Number(body.unitPrice ?? 0),
    batchNumber: body.batchNumber || null,
    reorderLevel: Number(body.reorderLevel ?? body.minStock ?? 10),
    location: body.location || "Main pharmacy store",
    notes: body.notes || null,
  };
  await saveInventoryMetadata(context.pharmacist.tenantId, metadata, context.pharmacist.id);

  const refreshed = await listInventory(context.pharmacist.tenantId);
  const item = refreshed.items.find((entry) => entry.id === created.id);
  return NextResponse.json(item, { status: 201 });
}
