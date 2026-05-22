import { NextRequest, NextResponse } from "next/server";
import { LabService } from "@/lib/services/lab.service";
import { auth } from "@/lib/auth";

const service = new LabService();

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") || session.user.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const analytics = await service.getLabAnalytics(tenantId);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}

