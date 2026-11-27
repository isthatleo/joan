import { NextRequest, NextResponse } from "next/server";
import { buildHandoffContext } from "@/lib/copilot/context";
import { copilotErrorResponse } from "@/lib/copilot/route-errors";
import { resolveDoctorContext } from "@/lib/doctor/server";

export async function GET(request: NextRequest) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  if (!doctor.tenantId) {
    return NextResponse.json({ error: "Tenant context required" }, { status: 403 });
  }

  try {
    const copilotContext = await buildHandoffContext({ doctorId: doctor.id, tenantId: doctor.tenantId });
    return NextResponse.json(
      { ...copilotContext.counts, generatedAt: copilotContext.generatedAt },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return copilotErrorResponse(error, "copilot/overview");
  }
}
