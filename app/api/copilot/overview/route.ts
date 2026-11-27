import { NextRequest, NextResponse } from "next/server";
import { filterContextByAccess } from "@/lib/copilot/access";
import { resolveCopilotRequestContext } from "@/lib/copilot/actor";
import { buildHandoffContext } from "@/lib/copilot/context";
import { copilotErrorResponse } from "@/lib/copilot/route-errors";

export async function GET(request: NextRequest) {
  const gate = await resolveCopilotRequestContext(request.headers);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { actor, access } = gate;

  try {
    const copilotContext = await buildHandoffContext({
      actorId: actor.userId,
      tenantId: actor.tenantId,
      scopeToAssignee: actor.isDoctor,
    });
    const filteredContext = filterContextByAccess(copilotContext, access);
    return NextResponse.json(
      { ...filteredContext.counts, generatedAt: filteredContext.generatedAt },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return copilotErrorResponse(error, "copilot/overview");
  }
}
