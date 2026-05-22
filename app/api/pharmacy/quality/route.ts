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
    if (!can(permissions, "pharmacy.quality.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tenantId = session.user.tenantId;
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const filters = {
      result: searchParams.get('result') || undefined,
      testType: searchParams.get('testType') || undefined,
      inventoryItemId: searchParams.get('inventoryItemId') || undefined,
    };

    const records = await service.getQualityControlRecords(tenantId, filters);
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching quality control records:', error);
    return NextResponse.json({ error: "Failed to fetch quality control records" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const permissions = await resolvePermissions(session.user.id);
    if (!can(permissions, "pharmacy.quality.write")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tenantId = session.user.tenantId;
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

    const data = await request.json();

    const record = await service.createQualityControlRecord({
      ...data,
      tenantId,
      testedBy: session.user.id
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error creating quality control record:', error);
    return NextResponse.json({ error: "Failed to create quality control record" }, { status: 500 });
  }
}
