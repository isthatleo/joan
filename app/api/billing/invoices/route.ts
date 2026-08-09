import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billing.service";
import { requireAppUser } from "@/lib/api/route-guards";

const service = new BillingService();

export async function GET(request: NextRequest) {
  try {
    const access = await requireAppUser(request);
    if (!access.ok) return access.response;

    const invoices = await service.getTenantInvoices(access.user.tenantId || "");
    return NextResponse.json(invoices);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAppUser(request, ["super_admin", "hospital_admin", "accountant"]);
    if (!access.ok) return access.response;

    const data = await request.json();
    const invoice = await service.createInvoice(data);
    return NextResponse.json(invoice);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
