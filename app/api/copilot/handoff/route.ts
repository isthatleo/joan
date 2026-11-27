import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/api/utils";
import { buildHandoffContext } from "@/lib/copilot/context";
import { copilotErrorResponse } from "@/lib/copilot/route-errors";
import { generateHandoff } from "@/lib/copilot/service";
import { DEFAULT_HANDOFF_QUESTION } from "@/lib/copilot/types";
import { resolveDoctorContext } from "@/lib/doctor/server";

const requestSchema = z.object({
  question: z.string().trim().min(1).max(500).default(DEFAULT_HANDOFF_QUESTION),
});

export async function POST(request: NextRequest) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  if (!doctor.tenantId) {
    return NextResponse.json({ error: "Tenant context required" }, { status: 403 });
  }

  if (!checkRateLimit(`copilot-handoff:${doctor.id}`, 12, 60_000)) {
    return NextResponse.json({ error: "Too many copilot requests. Try again shortly." }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid copilot request" }, { status: 400 });
    }

    const copilotContext = await buildHandoffContext({ doctorId: doctor.id, tenantId: doctor.tenantId });
    const handoff = await generateHandoff({
      context: copilotContext,
      question: parsed.data.question,
      actor: { doctorId: doctor.id, tenantId: doctor.tenantId },
    });

    return NextResponse.json(handoff, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return copilotErrorResponse(error, "copilot/handoff");
  }
}
