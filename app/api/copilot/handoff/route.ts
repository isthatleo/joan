import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/api/utils";
import { filterContextByAccess } from "@/lib/copilot/access";
import { resolveCopilotRequestContext } from "@/lib/copilot/actor";
import { buildHandoffContext } from "@/lib/copilot/context";
import { copilotErrorResponse } from "@/lib/copilot/route-errors";
import { generateHandoff } from "@/lib/copilot/service";
import { DEFAULT_HANDOFF_QUESTION } from "@/lib/copilot/types";

const requestSchema = z.object({
  question: z.string().trim().min(1).max(500).default(DEFAULT_HANDOFF_QUESTION),
});

export async function POST(request: NextRequest) {
  const gate = await resolveCopilotRequestContext(request.headers);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { actor, access } = gate;

  if (!checkRateLimit(`copilot-handoff:${actor.userId}`, 12, 60_000)) {
    return NextResponse.json({ error: "Too many copilot requests. Try again shortly." }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid copilot request" }, { status: 400 });
    }

    const copilotContext = await buildHandoffContext({
      actorId: actor.userId,
      tenantId: actor.tenantId,
      scopeToAssignee: actor.isDoctor,
    });
    const filteredContext = filterContextByAccess(copilotContext, access);
    const handoff = await generateHandoff({
      context: filteredContext,
      question: parsed.data.question,
      actor,
    });

    return NextResponse.json(handoff, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return copilotErrorResponse(error, "copilot/handoff");
  }
}
