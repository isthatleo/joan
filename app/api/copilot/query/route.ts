import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/api/utils";
import { filterContextByAccess } from "@/lib/copilot/access";
import { resolveCopilotRequestContext } from "@/lib/copilot/actor";
import { buildQueryContext } from "@/lib/copilot/context";
import { copilotErrorResponse } from "@/lib/copilot/route-errors";
import { generateQueryAnswer } from "@/lib/copilot/service";
import { DEFAULT_QUERY_PROMPT } from "@/lib/copilot/types";

const requestSchema = z.object({
  question: z.string().trim().min(1).max(500).default(DEFAULT_QUERY_PROMPT),
  patientId: z.string().trim().min(1).max(200).optional(),
  queueId: z.string().trim().min(1).max(200).optional(),
});

export async function POST(request: NextRequest) {
  const gate = await resolveCopilotRequestContext(request.headers);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { actor, access } = gate;
  const scopeToAssignee = actor.isDoctor;

  if (!checkRateLimit(`copilot-query:${actor.userId}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many copilot requests. Try again shortly." }, { status: 429 });
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid copilot request" }, { status: 400 });
  }

  try {
    const copilotContext = await buildQueryContext({
      actorId: actor.userId,
      tenantId: actor.tenantId,
      patientId: body.patientId,
      queueId: body.queueId,
      scopeToAssignee,
    });

    if (!copilotContext) {
      return NextResponse.json(
        {
          error: scopeToAssignee
            ? "That patient is not in your assigned care scope."
            : "Patient not found in your tenant.",
        },
        { status: 404 }
      );
    }

    const filteredContext = filterContextByAccess(copilotContext, access);
    const answer = await generateQueryAnswer({
      context: filteredContext,
      question: body.question,
      actor,
      scope: {
        tenantId: actor.tenantId,
        userId: actor.userId,
        allowedCategories: Array.from(access.allowedCategories).sort(),
        factsReviewed: filteredContext.facts.length,
        scopeToAssignee,
      },
    });

    return NextResponse.json(answer, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return copilotErrorResponse(error, "copilot/query");
  }
}
