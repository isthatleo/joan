import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { eq, like, and, type SQL } from "drizzle-orm";
import { requireAppUser } from "@/lib/api/route-guards";

function isSuperAdmin(role: string | null) {
  return String(role || "").toLowerCase() === "super_admin";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const search = searchParams.get("search");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const access = await requireAppUser(request);
    if (!access.ok) return access.response;
    if (!isSuperAdmin(access.user.role) && access.user.tenantId !== tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const conditions: SQL[] = [eq(inventoryItems.tenantId, tenantId)];

    if (search) {
      conditions.push(like(inventoryItems.name, `%${search}%`));
    }

    const items = await db.select().from(inventoryItems).where(and(...conditions));
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAppUser(request, ["super_admin", "hospital_admin", "pharmacist"]);
    if (!access.ok) return access.response;

    const data = await request.json();
    const { tenantId, name, stock, expiryDate } = data;

    if (!tenantId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!isSuperAdmin(access.user.role) && access.user.tenantId !== tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [item] = await db.insert(inventoryItems).values({
      tenantId,
      name,
      stock: stock || "0",
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error adding inventory item:", error);
    return NextResponse.json({ error: "Failed to add inventory item" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const access = await requireAppUser(request, ["super_admin", "hospital_admin", "pharmacist"]);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Inventory item ID required" }, { status: 400 });
    }

    const existing = await db.query.inventoryItems.findFirst({ where: eq(inventoryItems.id, id) });
    if (!existing) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }
    if (!isSuperAdmin(access.user.role) && access.user.tenantId !== existing.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();
    const { name, stock, expiryDate } = data;

    const [item] = await db.update(inventoryItems)
      .set({
        name,
        stock,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        updatedAt: new Date()
      })
      .where(eq(inventoryItems.id, id))
      .returning();

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating inventory:", error);
    return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 });
  }
}
