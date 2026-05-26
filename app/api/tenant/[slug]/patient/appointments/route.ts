import { NextRequest, NextResponse } from "next/server";
import { createPatientAppointment, getPatientAppointmentsData, resolvePatientPortalContext } from "@/lib/patient-portal/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await resolvePatientPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const data = await getPatientAppointmentsData(context.context);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await resolvePatientPortalContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const body = await request.json();
  if (!body?.doctorId || !body?.scheduledAt) {
    return NextResponse.json({ error: "Doctor and appointment time are required" }, { status: 400 });
  }

  const appointment = await createPatientAppointment(context.context, body);
  return NextResponse.json({ appointment }, { status: 201 });
}
