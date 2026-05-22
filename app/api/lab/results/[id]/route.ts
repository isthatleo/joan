import { NextRequest, NextResponse } from "next/server";
import { LabService } from "@/lib/services/lab.service";
import { auth } from "@/lib/auth";

const service = new LabService();

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

    const results = await service.getLabResults(orderId, tenantId);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Failed to fetch lab results:", error);
    return NextResponse.json({ error: "Failed to fetch lab results" }, { status: 500 });
  }
}

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

    const tenantId = session.user.tenantId;
    const resultId = resolvedParams.id;
    const data = await request.json();

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const result = await service.updateLabResult(resultId, data, tenantId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update lab result:", error);
    return NextResponse.json({ error: "Failed to update lab result" }, { status: 500 });
  }
}

