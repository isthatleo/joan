import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billing.service";
import { requireTenantUser } from "@/lib/api/route-guards";

const service = new BillingService();

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantUser(request, ["accountant", "receptionist"]);
    if (!access.ok) return access.response;

    const data = await request.json();
    const payment = await service.processPayment(data);
    return NextResponse.json(payment);
  } catch (error) {
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 });
  }
}
