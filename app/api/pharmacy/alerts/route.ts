import { NextRequest, NextResponse } from "next/server";
import { getPharmacySettings, listStockAlerts, saveAlertState } from "@/lib/pharmacy/data";
import { resolvePharmacyContext } from "@/lib/pharmacy/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolvePharmacyContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const data = await listStockAlerts(context.pharmacist.tenantId);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const context = await resolvePharmacyContext(request.headers, body.slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!body.itemId || !body.action) return NextResponse.json({ error: "Alert item and action are required" }, { status: 400 });

  const settings = await getPharmacySettings(context.pharmacist.tenantId);
  const alertState = { ...settings.alertState };
  const existing = alertState[body.itemId] || {};
  if (body.action === "dismiss") existing.dismissedAt = new Date().toISOString();
  if (body.action === "reorder") existing.reorderRequestedAt = new Date().toISOString();
  if (body.note !== undefined) existing.note = body.note;
  alertState[body.itemId] = existing;
  await saveAlertState(context.pharmacist.tenantId, alertState, context.pharmacist.id);
  return NextResponse.json({ success: true });
}
