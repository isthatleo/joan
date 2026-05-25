import { NextRequest, NextResponse } from "next/server";
import { getPharmacySettings, listInventory, saveSuppliers } from "@/lib/pharmacy/data";
import { resolvePharmacyContext } from "@/lib/pharmacy/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolvePharmacyContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const [settings, inventory] = await Promise.all([getPharmacySettings(context.pharmacist.tenantId), listInventory(context.pharmacist.tenantId)]);
  const rows = settings.suppliers.map((supplier) => ({
    ...supplier,
    inventoryItems: inventory.items.filter((item) => item.supplierId === supplier.id || item.supplier === supplier.name).length,
  }));
  return NextResponse.json({
    suppliers: rows,
    stats: {
      total: rows.length,
      active: rows.filter((item) => item.active !== false).length,
      ratedHigh: rows.filter((item) => Number(item.rating || 0) >= 4).length,
    },
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const context = await resolvePharmacyContext(request.headers, body.slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!body.name) return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });

  const settings = await getPharmacySettings(context.pharmacist.tenantId);
  const supplier = {
    id: body.id || crypto.randomUUID(),
    name: String(body.name).trim(),
    email: body.email || null,
    phone: body.phone || null,
    contactPerson: body.contactPerson || null,
    address: body.address || null,
    leadTimeDays: body.leadTimeDays ? Number(body.leadTimeDays) : null,
    rating: body.rating ? Number(body.rating) : null,
    active: body.active !== false,
    notes: body.notes || null,
    createdAt: body.createdAt || new Date().toISOString(),
  };
  await saveSuppliers(context.pharmacist.tenantId, [supplier, ...settings.suppliers.filter((item) => item.id !== supplier.id)], context.pharmacist.id);
  return NextResponse.json(supplier, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const context = await resolvePharmacyContext(request.headers, body.slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const settings = await getPharmacySettings(context.pharmacist.tenantId);
  await saveSuppliers(context.pharmacist.tenantId, settings.suppliers.filter((item) => item.id !== body.id), context.pharmacist.id);
  return NextResponse.json({ success: true });
}
