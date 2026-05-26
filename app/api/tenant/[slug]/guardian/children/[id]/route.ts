import { NextRequest, NextResponse } from "next/server";
import {
  getGuardianChildProfile,
  resolveGuardianPortalContext,
  unlinkGuardianChild,
  updateGuardianChildPermissions,
} from "@/lib/guardian-portal/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const context = await resolveGuardianPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const data = await getGuardianChildProfile(context.context, id);
  if (!data) return NextResponse.json({ error: "Child not found" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const { slug, id } = await params;
    const context = await resolveGuardianPortalContext(request.headers, slug);
    if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
    const body = await request.json();
    const result = await updateGuardianChildPermissions(context.context, id, {
      canViewRecords: typeof body?.canViewRecords === "boolean" ? body.canViewRecords : undefined,
      canSchedule: typeof body?.canSchedule === "boolean" ? body.canSchedule : undefined,
      emergencyContact: typeof body?.emergencyContact === "boolean" ? body.emergencyContact : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update child permissions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const { slug, id } = await params;
    const context = await resolveGuardianPortalContext(request.headers, slug);
    if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
    const result = await unlinkGuardianChild(context.context, id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to unlink child";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
