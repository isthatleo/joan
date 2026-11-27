import { NextRequest, NextResponse } from "next/server";
import { buildPatientContext } from "@/lib/copilot/context";
import { copilotErrorResponse } from "@/lib/copilot/route-errors";
import { generateNoteInsight } from "@/lib/copilot/service";
import { resolveDoctorContext } from "@/lib/doctor/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  if (!doctor.tenantId) {
    return NextResponse.json({ error: "Tenant context required" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const copilotContext = await buildPatientContext({
      actorId: doctor.id,
      tenantId: doctor.tenantId,
      patientId: id,
      scopeToAssignee: true,
    });
    if (!copilotContext) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const insight = await generateNoteInsight({
      context: copilotContext,
      focus: "assessment",
      patientId: id,
      actor: {
        userId: doctor.id,
        tenantId: doctor.tenantId,
        email: doctor.email,
        fullName: doctor.fullName,
        isDoctor: true,
      },
    });

    return NextResponse.json(
      {
        summary: insight.suggestedText,
        alerts: insight.limitations,
        copilot: insight,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return copilotErrorResponse(error, "ai/summary");
  }
}
