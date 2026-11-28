import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/api/utils";
import { resolvePlatformCopilotActor } from "@/lib/platform-copilot/actor";
import { buildPlatformCopilotContext } from "@/lib/platform-copilot/context";
import {
  createPlatformChatSessionScope,
  matchesPlatformChatSessionScope,
  platformChatSessionScopeSchema,
} from "@/lib/platform-copilot/history-scope";
import { platformCopilotErrorResponse } from "@/lib/platform-copilot/route-errors";
import { generatePlatformChatAnswer } from "@/lib/platform-copilot/service";
import {
  PLATFORM_CHAT_HISTORY_LIMIT,
  PLATFORM_CHAT_MESSAGE_MAX_LENGTH,
  PLATFORM_CHAT_REQUEST_MAX_LENGTH,
} from "@/lib/platform-copilot/types";

const NO_STORE = { "Cache-Control": "no-store" };

// Strict shape: no patientId, queueId, tenantId, role, or write-action fields.
const requestSchema = z
  .object({
    message: z.string().trim().min(1).max(PLATFORM_CHAT_REQUEST_MAX_LENGTH),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(PLATFORM_CHAT_MESSAGE_MAX_LENGTH),
        })
      )
      .max(PLATFORM_CHAT_HISTORY_LIMIT)
      .default([]),
    historyScope: platformChatSessionScopeSchema.optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const gate = await resolvePlatformCopilotActor(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status, headers: NO_STORE });
  }

  if (!checkRateLimit(`platform-copilot:${gate.actor.userId}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many platform copilot requests. Try again shortly." },
      { status: 429, headers: NO_STORE }
    );
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid platform copilot request" }, { status: 400, headers: NO_STORE });
  }

  const expectedHistoryScope = createPlatformChatSessionScope(gate.actor.userId);
  if (
    body.history.length > 0 &&
    !matchesPlatformChatSessionScope(body.historyScope, expectedHistoryScope)
  ) {
    return NextResponse.json(
      { error: "Chat history belongs to a different Copilot session. Start a new chat." },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    const context = await buildPlatformCopilotContext();
    const answer = await generatePlatformChatAnswer({
      context,
      message: body.message,
      history: body.history,
      actor: gate.actor,
    });
    return NextResponse.json(
      { ...answer, historyScope: expectedHistoryScope },
      { headers: NO_STORE }
    );
  } catch (error) {
    return platformCopilotErrorResponse(error, "super-admin/copilot/chat");
  }
}
