import { NextRequest, NextResponse } from "next/server";
import { getPatientPrescriptionsData, resolvePatientPortalContext } from "@/lib/patient-portal/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await resolvePatientPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const data = await getPatientPrescriptionsData(context.context);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
