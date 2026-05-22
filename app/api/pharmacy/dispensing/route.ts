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
    if (!can(permissions, "pharmacy.dispensing.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tenantId = session.user.tenantId;
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const queue = await service.getDispensingQueue(tenantId, status);
    return NextResponse.json(queue);
  } catch (error) {
    console.error('Error fetching dispensing queue:', error);
    return NextResponse.json({ error: "Failed to fetch dispensing queue" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const permissions = await resolvePermissions(session.user.id);
    if (!can(permissions, "pharmacy.dispensing.write")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const data = await request.json();
    const { itemId, quantity, inventoryItemId, counselingProvided, counselingNotes } = data;

    const result = await service.completeDispensing(
      itemId,
      session.user.id,
      quantity,
      inventoryItemId,
      counselingProvided,
      counselingNotes
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error completing dispensing:', error);
    return NextResponse.json({ error: "Failed to complete dispensing" }, { status: 500 });
  }
}
