import { NextRequest, NextResponse } from "next/server";
import { TenantService } from "@/lib/services/tenant.service";

const service = new TenantService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await service.getTenant(params.id);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json({ error: "Failed to fetch tenant" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const tenant = await service.updateTenant(params.id, data);
    if (!tenant.length) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    return NextResponse.json(tenant[0]);
  } catch (error) {
    console.error("Error updating tenant:", error);
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await service.deleteTenant(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tenant:", error);
    return NextResponse.json({ error: "Failed to delete tenant" }, { status: 500 });
  }
}

// Handle PATCH for specific actions
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action } = await request.json();

    switch (action) {
      case "suspend":
        const suspended = await service.suspendTenant(params.id);
        return NextResponse.json(suspended[0]);
      case "activate":
        const activated = await service.activateTenant(params.id);
        return NextResponse.json(activated[0]);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error performing tenant action:", error);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
