import { NextRequest, NextResponse } from "next/server";
import { resolveGuardianPortalContext, updateGuardianAppointment } from "@/lib/guardian-portal/data";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const context = await resolveGuardianPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const body = await request.json();
  try {
    await updateGuardianAppointment(context.context, id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update appointment" }, { status: 400 });
  }
}
