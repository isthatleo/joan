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
    if (!can(permissions, "pharmacy.alerts.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tenantId = session.user.tenantId;
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const resolved = searchParams.get('resolved') === 'true' ? true : searchParams.get('resolved') === 'false' ? false : undefined;

    const alerts = await service.getStockAlerts(tenantId, resolved);
    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error fetching stock alerts:', error);
    return NextResponse.json({ error: "Failed to fetch stock alerts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const permissions = await resolvePermissions(session.user.id);
    if (!can(permissions, "pharmacy.alerts.write")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const data = await request.json();
    const { id, actionTaken } = data;

    const result = await service.resolveStockAlert(id, session.user.id, actionTaken);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error resolving stock alert:', error);
    return NextResponse.json({ error: "Failed to resolve stock alert" }, { status: 500 });
  }
}
