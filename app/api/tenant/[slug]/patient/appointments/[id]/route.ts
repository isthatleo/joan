import { NextRequest, NextResponse } from "next/server";
import { resolvePatientPortalContext, updatePatientAppointment } from "@/lib/patient-portal/data";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const context = await resolvePatientPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const body = await request.json();
  await updatePatientAppointment(context.context, id, body);
  return NextResponse.json({ success: true });
}
