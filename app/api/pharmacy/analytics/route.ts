import { NextRequest, NextResponse } from "next/server";
import { PharmacyService } from "@/lib/services/pharmacy.service";
import { resolvePermissions, can } from "@/lib/auth/permission-engine";
import { auth } from "@/lib/auth/config";

const service = new PharmacyService();

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const permissions = await resolvePermissions(session.user.id);
    if (!can(permissions, "pharmacy.analytics.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tenantId = session.user.tenantId;
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const category = searchParams.get('category') || undefined;

    const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

    const analytics = await service.getPharmacyAnalytics(tenantId, dateRange, category);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching pharmacy analytics:', error);
    return NextResponse.json({ error: "Failed to fetch pharmacy analytics" }, { status: 500 });
  }
}
