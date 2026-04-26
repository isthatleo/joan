import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { eq, like, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const search = searchParams.get("search");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    let query = db.select().from(inventoryItems).where(eq(inventoryItems.tenantId, tenantId));

    if (search) {
      query = query.where(like(inventoryItems.name, `%${search}%`));
    }

    const items = await query;
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { tenantId, name, stock, expiryDate } = data;

    if (!tenantId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Inventory item ID required" }, { status: 400 });
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

