import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceItems, payments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");

    let query = db.select().from(invoices);

    if (patientId) {
      query = query.where(eq(invoices.patientId, patientId));
    }

    if (status) {
      query = query.where(eq(invoices.status, status));
    }

    const invoiceList = await query;
    return NextResponse.json(invoiceList);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { patientId, items, totalAmount } = data;

    if (!patientId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create invoice
    const [invoice] = await db.insert(invoices).values({
      patientId,
      totalAmount,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Add invoice items
    for (const item of items) {
      await db.insert(invoiceItems).values({
        invoiceId: invoice.id,
        description: item.description,
        amount: item.amount,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Fetch complete invoice with items
    const completeInvoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoice.id),
      with: {
        invoiceItems: true,
      },
    });

    return NextResponse.json(completeInvoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
    }

    const data = await request.json();
    const { status } = data;

    const [invoice] = await db.update(invoices)
      .set({ status, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}

