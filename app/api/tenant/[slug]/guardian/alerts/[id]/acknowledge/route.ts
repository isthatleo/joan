import { NextRequest, NextResponse } from "next/server";
import { acknowledgeGuardianAlert, resolveGuardianPortalContext } from "@/lib/guardian-portal/data";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const context = await resolveGuardianPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  return NextResponse.json(await acknowledgeGuardianAlert(context.context, id));
}
