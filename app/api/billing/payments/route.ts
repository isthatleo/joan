import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billing.service";

const service = new BillingService();

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const payment = await service.processPayment(data);
    return NextResponse.json(payment);
  } catch (error) {
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 });
  }
}
