import { NextRequest, NextResponse } from "next/server";
import { PharmacyService } from "@/lib/services/pharmacy.service";
import { getTenantBySlug } from "@/lib/db/helpers";
import { requireTenantUser } from "@/lib/api/route-guards";

const pharmacyService = new PharmacyService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;
    const access = await requireTenantUser(request, ["pharmacist"]);
    if (!access.ok) return access.response;
    const tenant = await getTenantBySlug(slug);
    if (!tenant || tenant.id !== access.user.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const {
      medicationId,
      name,
      genericName,
      category,
      dosage,
      batchNumber,
      manufacturer,
      quantity,
      minStockLevel,
      maxStockLevel,
      unitPrice,
      sellingPrice,
      expiryDate,
      location,
      supplierId,
      barcode,
      notes
    } = body;

    if (!name || !batchNumber || !manufacturer || quantity === undefined || !unitPrice || !sellingPrice || !expiryDate) {
      return NextResponse.json(
        { error: "Missing required fields: name, batchNumber, manufacturer, quantity, unitPrice, sellingPrice, expiryDate" },
        { status: 400 }
      );
    }

    const newStock = await pharmacyService.addNewStock(slug, {
      medicationId,
      name,
      genericName,
      category,
      dosage,
      batchNumber,
      manufacturer,
      quantity: Number(quantity),
      minStockLevel: minStockLevel ? Number(minStockLevel) : undefined,
      maxStockLevel: maxStockLevel ? Number(maxStockLevel) : undefined,
      unitPrice: Number(unitPrice),
      sellingPrice: Number(sellingPrice),
      expiryDate: new Date(expiryDate),
      location,
      supplierId,
      barcode,
      notes
    });

    return NextResponse.json(newStock);
  } catch (error) {
    console.error("Error adding new stock:", error);
    return NextResponse.json(
      { error: "Failed to add new stock" },
      { status: 500 }
    );
  }
}
