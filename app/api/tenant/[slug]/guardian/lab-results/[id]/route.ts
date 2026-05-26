import { NextRequest, NextResponse } from "next/server";
import { getGuardianLabResultById, resolveGuardianPortalContext } from "@/lib/guardian-portal/data";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const context = await resolveGuardianPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const result = await getGuardianLabResultById(context.context, id);
  if (!result) return NextResponse.json({ error: "Lab result not found" }, { status: 404 });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
