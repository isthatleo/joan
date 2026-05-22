import { NextRequest, NextResponse } from "next/server";
import { LabService } from "@/lib/services/lab.service";
import { auth } from "@/lib/auth";

const service = new LabService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const tenantId = session.user.tenantId;
    const orderId = resolvedParams.id;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const result = await service.updateLabOrderStatus(orderId, body.status, tenantId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update lab order:", error);
    return NextResponse.json({ error: "Failed to update lab order" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const orderId = resolvedParams.id;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const order = await service.getLabOrder(orderId, tenantId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Failed to fetch lab order:", error);
    return NextResponse.json({ error: "Failed to fetch lab order" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const orderId = resolvedParams.id;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    await service.deleteLabOrder(orderId, tenantId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete lab order:", error);
    return NextResponse.json({ error: "Failed to delete lab order" }, { status: 500 });
  }
}

