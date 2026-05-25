import { NextRequest, NextResponse } from "next/server";
import { getPharmacySettings, listDrugInteractions, saveInteractions } from "@/lib/pharmacy/data";
import { resolvePharmacyContext } from "@/lib/pharmacy/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolvePharmacyContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const data = await listDrugInteractions(context.pharmacist.tenantId);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const context = await resolvePharmacyContext(request.headers, body.slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!body.medicationA || !body.medicationB || !body.effect || !body.recommendation) {
    return NextResponse.json({ error: "Medication pair, effect, and recommendation are required" }, { status: 400 });
  }

  const settings = await getPharmacySettings(context.pharmacist.tenantId);
  const interactions = [{
    id: body.id || crypto.randomUUID(),
    medicationA: String(body.medicationA).trim(),
    medicationB: String(body.medicationB).trim(),
    severity: body.severity || "moderate",
    effect: String(body.effect).trim(),
    recommendation: String(body.recommendation).trim(),
    source: body.source || null,
    active: body.active !== false,
    createdAt: body.createdAt || new Date().toISOString(),
  }, ...settings.interactions.filter((item) => item.id !== body.id)];
  await saveInteractions(context.pharmacist.tenantId, interactions, context.pharmacist.id);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const context = await resolvePharmacyContext(request.headers, body.slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const settings = await getPharmacySettings(context.pharmacist.tenantId);
  await saveInteractions(context.pharmacist.tenantId, settings.interactions.filter((item) => item.id !== body.id), context.pharmacist.id);
  return NextResponse.json({ success: true });
}
