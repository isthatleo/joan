import { NextRequest, NextResponse } from "next/server";
import { requestPatientPrescriptionRefill, resolvePatientPortalContext } from "@/lib/patient-portal/data";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const context = await resolvePatientPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const refill = await requestPatientPrescriptionRefill(context.context, id);
  return NextResponse.json({ refill }, { status: 201 });
}
