import { NextRequest, NextResponse } from "next/server";
import {
  getGuardianChildrenData,
  linkGuardianChild,
  resolveGuardianPortalContext,
  searchGuardianLinkablePatients,
} from "@/lib/guardian-portal/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await resolveGuardianPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  if (query) {
    return NextResponse.json(await searchGuardianLinkablePatients(context.context, query), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
  return NextResponse.json(await getGuardianChildrenData(context.context), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const context = await resolveGuardianPortalContext(request.headers, slug);
    if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
    const body = await request.json();
    if (!body?.patientId) return NextResponse.json({ error: "Patient is required" }, { status: 400 });
    const result = await linkGuardianChild(context.context, {
      patientId: String(body.patientId),
      canViewRecords: body.canViewRecords !== false,
      canSchedule: body.canSchedule !== false,
      emergencyContact: body.emergencyContact === true,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to link child";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
