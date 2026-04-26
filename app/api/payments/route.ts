import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
    }

    const paymentList = await db.query.payments.findMany({
      where: eq(payments.invoiceId, invoiceId),
    });

    return NextResponse.json(paymentList);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { invoiceId, method, amount } = data;

    if (!invoiceId || !method || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [payment] = await db.insert(payments).values({
      invoiceId,
      method,
      amount,
      status: "completed",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
  }
}

