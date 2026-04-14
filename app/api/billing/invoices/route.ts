import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billing.service";

const service = new BillingService();

export async function GET(request: NextRequest) {
  try {
    const invoices = await service.getTenantInvoices("tenant-id");
    return NextResponse.json(invoices);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const invoice = await service.createInvoice(data);
    return NextResponse.json(invoice);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
