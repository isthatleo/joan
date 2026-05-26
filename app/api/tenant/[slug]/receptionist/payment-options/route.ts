import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug } from "@/lib/receptionist/data";
import { getTenantPaymentConfiguration } from "@/lib/receptionist/payment";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const config = await getTenantPaymentConfiguration(tenant.id);
    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to fetch receptionist payment options:", error);
    return NextResponse.json({ error: "Failed to fetch receptionist payment options" }, { status: 500 });
  }
}
