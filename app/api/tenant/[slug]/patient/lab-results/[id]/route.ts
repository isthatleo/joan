import { NextRequest, NextResponse } from "next/server";
import { getPatientLabResultById, resolvePatientPortalContext } from "@/lib/patient-portal/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const context = await resolvePatientPortalContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const result = await getPatientLabResultById(context.context, id);
  if (!result) {
    return NextResponse.json({ error: "Lab result not found" }, { status: 404 });
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
