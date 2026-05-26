import { NextRequest, NextResponse } from "next/server";
import { getGuardianAppointmentOptions, getGuardianDoctorSlots, resolveGuardianPortalContext } from "@/lib/guardian-portal/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await resolveGuardianPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get("doctorId");
  const date = searchParams.get("date");
  if (doctorId && date) {
    return NextResponse.json({ slots: await getGuardianDoctorSlots(context.context, doctorId, date) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
  return NextResponse.json(await getGuardianAppointmentOptions(context.context), { headers: { "Cache-Control": "no-store, max-age=0" } });
}
