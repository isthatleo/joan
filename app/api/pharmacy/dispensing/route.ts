import { NextRequest, NextResponse } from "next/server";
import { listDispensingQueue, updatePrescriptionStatus } from "@/lib/pharmacy/data";
import { resolvePharmacyContext } from "@/lib/pharmacy/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolvePharmacyContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const data = await listDispensingQueue(context.pharmacist.tenantId, {
    status: request.nextUrl.searchParams.get("status"),
    search: request.nextUrl.searchParams.get("search"),
  });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const context = await resolvePharmacyContext(request.headers, body.slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!body.prescriptionId || !body.action) return NextResponse.json({ error: "Prescription and action are required" }, { status: 400 });

  const actionMap: Record<string, string> = {
    start: "start-dispensing",
    complete: "fill",
    partial: "partial",
    reject: "reject",
    ready: "ready",
  };

  const updated = await updatePrescriptionStatus(context.pharmacist.tenantId, context.pharmacist.id, body.prescriptionId, actionMap[body.action] || body.action, body);
  return NextResponse.json(updated);
}
