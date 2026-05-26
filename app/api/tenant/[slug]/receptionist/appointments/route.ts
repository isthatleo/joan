import { NextRequest, NextResponse } from "next/server";
import { createReceptionAppointment, getReceptionAppointments, getTenantBySlug } from "@/lib/receptionist/data";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const todayOnly = request.nextUrl.searchParams.get("today") === "true";
    const patientId = request.nextUrl.searchParams.get("patientId") || undefined;
    const appointments = await getReceptionAppointments(tenant.id, { todayOnly, patientId });
    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Failed to fetch receptionist appointments:", error);
    return NextResponse.json({ error: "Failed to fetch receptionist appointments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body?.patientId || !body?.scheduledAt) {
      return NextResponse.json({ error: "patientId and scheduledAt are required" }, { status: 400 });
    }

    const appointment = await createReceptionAppointment(tenant.id, {
      patientId: body.patientId,
      doctorId: body.doctorId || null,
      scheduledAt: body.scheduledAt,
      appointmentType: body.appointmentType || "Consultation",
      reason: body.reason || null,
      notes: body.notes || null,
    });

    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error) {
    console.error("Failed to create receptionist appointment:", error);
    return NextResponse.json({ error: "Failed to create receptionist appointment" }, { status: 500 });
  }
}
