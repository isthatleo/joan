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
    if (!can(permissions, "pharmacy.interactions.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tenantId = session.user.tenantId;
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const filters = {
      severity: searchParams.get('severity') || undefined,
      drugId: searchParams.get('drugId') || undefined,
    };

    const interactions = await service.getDrugInteractions(tenantId, filters);
    return NextResponse.json(interactions);
  } catch (error) {
    console.error('Error fetching drug interactions:', error);
    return NextResponse.json({ error: "Failed to fetch drug interactions" }, { status: 500 });
  }
}
