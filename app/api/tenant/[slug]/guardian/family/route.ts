import { NextRequest, NextResponse } from "next/server";
import { getGuardianFamilyData, resolveGuardianPortalContext } from "@/lib/guardian-portal/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await resolveGuardianPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  return NextResponse.json(await getGuardianFamilyData(context.context), { headers: { "Cache-Control": "no-store, max-age=0" } });
}
