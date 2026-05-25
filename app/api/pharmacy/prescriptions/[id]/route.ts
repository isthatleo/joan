import { NextRequest, NextResponse } from "next/server";
import { getPrescriptionById, updatePrescriptionStatus } from "@/lib/pharmacy/data";
import { resolvePharmacyContext } from "@/lib/pharmacy/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await resolvePharmacyContext(request.headers, request.nextUrl.searchParams.get("slug"));
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const prescription = await getPrescriptionById(context.pharmacist.tenantId, id);
  if (!prescription) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
  return NextResponse.json(prescription, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const context = await resolvePharmacyContext(request.headers, body.slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!body.action && !body.status) return NextResponse.json({ error: "Action or status is required" }, { status: 400 });

  try {
    const updated = await updatePrescriptionStatus(context.pharmacist.tenantId, context.pharmacist.id, id, body.action || "status", body);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update prescription" }, { status: 400 });
  }
}
