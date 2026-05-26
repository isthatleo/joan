import { NextRequest, NextResponse } from "next/server";
import { createGuardianAppointment, getGuardianAppointmentsData, resolveGuardianPortalContext } from "@/lib/guardian-portal/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await resolveGuardianPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  return NextResponse.json(await getGuardianAppointmentsData(context.context), { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await resolveGuardianPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const body = await request.json();
  try {
    const created = await createGuardianAppointment(context.context, body);
    return NextResponse.json({ success: true, appointment: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create appointment" }, { status: 400 });
  }
}
