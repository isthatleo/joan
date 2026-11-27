import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/utils";
import { CopilotConfigurationError, CopilotModelError } from "./service";

const NO_STORE = { "Cache-Control": "no-store" };

export function copilotErrorResponse(error: unknown, context: string) {
  if (error instanceof CopilotConfigurationError) {
    return NextResponse.json(
      { error: "AI Copilot is not configured. Set OPENAI_API_KEY on the server." },
      { status: 503, headers: NO_STORE }
    );
  }

  if (error instanceof CopilotModelError) {
    return NextResponse.json({ error: error.message }, { status: 502, headers: NO_STORE });
  }

  const response = handleApiError(error, context);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
