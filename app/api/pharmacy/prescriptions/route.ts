import { NextRequest, NextResponse } from "next/server";
import { createPrescriptionRecord, listPrescriptions } from "@/lib/pharmacy/data";
import { resolvePharmacyContext } from "@/lib/pharmacy/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolvePharmacyContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const data = await listPrescriptions(context.pharmacist.tenantId, {
    search: request.nextUrl.searchParams.get("search"),
    status: request.nextUrl.searchParams.get("status"),
    priority: request.nextUrl.searchParams.get("priority"),
  });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const context = await resolvePharmacyContext(request.headers, body.slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  if (!body.patientId || !Array.isArray(body.medications) || body.medications.length === 0) {
    return NextResponse.json({ error: "Patient and at least one medication are required" }, { status: 400 });
  }

  const created = await createPrescriptionRecord(context.pharmacist.tenantId, context.pharmacist.id, body);
  return NextResponse.json(created, { status: 201 });
}
