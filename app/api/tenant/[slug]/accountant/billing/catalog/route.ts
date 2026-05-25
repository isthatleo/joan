import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { getChargeCatalog, getChargeCatalogCoverage, saveChargeCatalog } from "@/lib/billing/patient-ledger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const [catalog, coverage] = await Promise.all([
    getChargeCatalog(tenantId),
    getChargeCatalogCoverage(tenantId),
  ]);
  return NextResponse.json({ ...catalog, coverage });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const body = await request.json();
  const catalog = {
    currency: String(body.currency || ""),
    consultationFee: Number(body.consultationFee || 0),
    labDefaultFee: Number(body.labDefaultFee || 0),
    medicationDefaultUnitPrice: Number(body.medicationDefaultUnitPrice || 0),
    labTests: typeof body.labTests === "object" && body.labTests ? body.labTests : {},
    medicationPrices: typeof body.medicationPrices === "object" && body.medicationPrices ? body.medicationPrices : {},
  };

  await saveChargeCatalog(tenantId, catalog, session.user.id as string);
  const [savedCatalog, coverage] = await Promise.all([
    getChargeCatalog(tenantId),
    getChargeCatalogCoverage(tenantId),
  ]);
  return NextResponse.json({ success: true, catalog: savedCatalog, coverage });
}
