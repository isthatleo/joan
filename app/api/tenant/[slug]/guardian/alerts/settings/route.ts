import { NextRequest, NextResponse } from "next/server";
import { getGuardianAlertSettings, resolveGuardianPortalContext, updateGuardianAlertSettings } from "@/lib/guardian-portal/data";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await resolveGuardianPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  return NextResponse.json(await getGuardianAlertSettings(context.context));
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await resolveGuardianPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const body = await request.json();
  return NextResponse.json(await updateGuardianAlertSettings(context.context, body));
}
