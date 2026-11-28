import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/api/utils";
import { filterContextByAccess } from "@/lib/copilot/access";
import { resolveCopilotRequestContext } from "@/lib/copilot/actor";
import { buildQueryContext } from "@/lib/copilot/context";
import { copilotErrorResponse } from "@/lib/copilot/route-errors";
import { generateQueryAnswer } from "@/lib/copilot/service";
import {
  COPILOT_CHAT_HISTORY_LIMIT,
  COPILOT_CHAT_MESSAGE_MAX_LENGTH,
  COPILOT_CHAT_REQUEST_MAX_LENGTH,
} from "@/lib/copilot/types";

const NO_STORE = { "Cache-Control": "no-store" };

const requestSchema = z
  .object({
    message: z.string().trim().min(1).max(COPILOT_CHAT_REQUEST_MAX_LENGTH),
    patientId: z.string().trim().min(1).max(200).optional(),
    queueId: z.string().trim().min(1).max(200).optional(),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(COPILOT_CHAT_MESSAGE_MAX_LENGTH),
        })
      )
      .max(COPILOT_CHAT_HISTORY_LIMIT)
      .default([]),
  })
  .strict();

export async function POST(request: NextRequest) {
  const gate = await resolveCopilotRequestContext(request.headers);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status, headers: NO_STORE });
  }

  const { actor, access } = gate;
  const scopeToAssignee = actor.isDoctor;

  if (!checkRateLimit(`copilot-chat:${actor.userId}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "Too many copilot requests. Try again shortly." },
      { status: 429, headers: NO_STORE }
    );
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid copilot chat request" }, { status: 400, headers: NO_STORE });
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
        { status: 404, headers: NO_STORE }
      );
    }

    const filteredContext = filterContextByAccess(copilotContext, access);
    const answer = await generateQueryAnswer({
      context: filteredContext,
      question: body.message,
      actor,
      history: body.history,
      scope: {
        tenantId: actor.tenantId,
        userId: actor.userId,
        allowedCategories: Array.from(access.allowedCategories).sort(),
        factsReviewed: filteredContext.facts.length,
        scopeToAssignee,
      },
    });

    return NextResponse.json(answer, { headers: NO_STORE });
  } catch (error) {
    return copilotErrorResponse(error, "copilot/chat");
  }
}
