import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug, rescheduleReceptionAppointment, updateReceptionAppointment } from "@/lib/receptionist/data";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; appointmentId: string }> },
) {
  try {
    const { slug, appointmentId } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const patch = await request.json();
    const appointment =
      patch?.scheduledAt || patch?.doctorId || patch?.reason || patch?.notes || patch?.appointmentType
        ? await rescheduleReceptionAppointment(tenant.id, appointmentId, {
            doctorId: patch?.doctorId || null,
            scheduledAt: patch?.scheduledAt || new Date(),
            appointmentType: patch?.appointmentType || "Consultation",
            reason: patch?.reason || null,
            notes: patch?.notes || null,
            status: patch?.status || "scheduled",
          })
        : await updateReceptionAppointment(tenant.id, appointmentId, patch || {});
    return NextResponse.json({ success: true, appointment });
  } catch (error) {
    console.error("Failed to update receptionist appointment:", error);
    return NextResponse.json({ error: "Failed to update receptionist appointment" }, { status: 500 });
  }
}
