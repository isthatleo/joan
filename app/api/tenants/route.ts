import { NextRequest, NextResponse } from "next/server";
import { TenantService } from "@/lib/services/tenant.service";

const service = new TenantService();

export async function GET(request: NextRequest) {
  try {
    const tenants = await service.getAllTenants();
    return NextResponse.json(tenants);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const tenant = await service.createTenant(data);
    return NextResponse.json(tenant);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });
  }
}
